<?php

namespace App\Http\Controllers\Flashcard;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\FlashcardCard;
use App\Models\FlashcardDeck;
use App\Models\FlashcardDeckShare;
use App\Models\FlashcardQuizAnswer;
use App\Models\FlashcardQuizSession;
use App\Models\FlashcardSrLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FlashcardStudentController extends Controller
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Get the class_id(s) tied to the authenticated student user.
     * student users have a reg_id; we look up class_id from students table.
     */
    private function studentClassIds(Request $request): array
    {
        $regId = $request->user()->reg_id;
        if (! $regId) {
            return [];
        }
        return \App\Models\Student::where('reg_id', $regId)
            ->pluck('class_id')
            ->filter()
            ->unique()
            ->values()
            ->toArray();
    }

    // ── Deck Listing ───────────────────────────────────────────────────────────

    /**
     * Return all decks assigned to the student's class + any the student
     * imported themselves.
     */
    public function index(Request $request): JsonResponse
    {
        $userId   = $request->user()->id;
        $classIds = $this->studentClassIds($request);

        // Decks assigned by teacher
        $assignedDeckIds = FlashcardDeckShare::whereIn('class_id', $classIds)
            ->pluck('deck_id')
            ->unique()
            ->values();

        $decks = FlashcardDeck::whereIn('id', $assignedDeckIds)
            ->withCount('cards')
            ->get();

        // Attach latest quiz session info + due SR count per deck
        $decks = $decks->map(function ($deck) use ($userId) {
            $lastSession = FlashcardQuizSession::where('deck_id', $deck->id)
                ->where('student_user_id', $userId)
                ->where('status', 'completed')
                ->latest('completed_at')
                ->first(['public_id', 'correct_count', 'total_questions', 'completed_at']);

            $dueCount = FlashcardSrLog::where('user_id', $userId)
                ->whereHas('card', fn($q) => $q->where('deck_id', $deck->id))
                ->where('next_due', '<=', now()->toDateString())
                ->count();

            return array_merge($deck->toArray(), [
                'last_session' => $lastSession,
                'sr_due_count' => $dueCount,
            ]);
        });

        return response()->json(['data' => $decks]);
    }

    public function show(Request $request, string $publicId): JsonResponse
    {
        $userId   = $request->user()->id;
        $classIds = $this->studentClassIds($request);

        $deck = FlashcardDeck::where('public_id', $publicId)
            ->whereHas('shares', fn($q) => $q->whereIn('class_id', $classIds))
            ->with('cards')
            ->firstOrFail();

        // Attach per-card SR info for this user
        $cardIds = $deck->cards->pluck('id');
        $srMap   = FlashcardSrLog::where('user_id', $userId)
            ->whereIn('card_id', $cardIds)
            ->get()
            ->keyBy('card_id');

        $deck->cards->each(function ($card) use ($srMap) {
            $sr = $srMap->get($card->id);
            $card->sr = $sr ? [
                'ease_factor'   => $sr->ease_factor,
                'interval_days' => $sr->interval_days,
                'repetitions'   => $sr->repetitions,
                'next_due'      => $sr->next_due?->toDateString(),
            ] : null;
        });

        return response()->json(['data' => $deck]);
    }

    // ── Spaced Repetition ──────────────────────────────────────────────────────

    /**
     * Return all cards due today across all assigned decks.
     */
    public function reviewQueue(Request $request): JsonResponse
    {
        $userId   = $request->user()->id;
        $classIds = $this->studentClassIds($request);

        $assignedDeckIds = FlashcardDeckShare::whereIn('class_id', $classIds)
            ->pluck('deck_id');

        $dueCards = FlashcardSrLog::where('user_id', $userId)
            ->where('next_due', '<=', now()->toDateString())
            ->whereHas('card', fn($q) => $q->whereIn('deck_id', $assignedDeckIds))
            ->with(['card:id,public_id,deck_id,front,back,category_tag,has_cloze', 'card.deck:id,public_id,title'])
            ->get();

        return response()->json([
            'data'  => $dueCards,
            'total' => $dueCards->count(),
        ]);
    }

    /**
     * Update SM-2 log after a flashcard review (Easy / Good / Hard).
     * rating: 0=Hard, 1=Good, 2=Easy
     */
    public function updateSr(Request $request, string $cardPublicId): JsonResponse
    {
        $request->validate(['rating' => 'required|integer|in:0,1,2']);

        $userId = $request->user()->id;
        $card   = FlashcardCard::where('public_id', $cardPublicId)->firstOrFail();

        $log = FlashcardSrLog::firstOrNew(
            ['user_id' => $userId, 'card_id' => $card->id],
            ['ease_factor' => 2.50, 'interval_days' => 1, 'repetitions' => 0, 'next_due' => now()->toDateString()]
        );

        $log->applyRating((int) $request->input('rating'));
        $log->save();

        return response()->json(['data' => $log]);
    }

    // ── Quiz Session ───────────────────────────────────────────────────────────

    /**
     * Generate quiz questions and create a new session.
     * quiz_types: ['mc','tf','identification','cloze'] — subset supported
     */
    public function startQuiz(Request $request, string $publicId): JsonResponse
    {
        $validated = $request->validate([
            'quiz_types' => 'required|array|min:1',
            'quiz_types.*' => 'in:mc,tf,identification,cloze',
        ]);

        $userId   = $request->user()->id;
        $classIds = $this->studentClassIds($request);

        $deck = FlashcardDeck::where('public_id', $publicId)
            ->whereHas('shares', fn($q) => $q->whereIn('class_id', $classIds))
            ->with('cards')
            ->firstOrFail();

        $cards = $deck->cards;

        if ($cards->count() < 2) {
            throw ValidationException::withMessages(['deck' => 'Deck needs at least 2 cards for a quiz.']);
        }

        $quizTypes   = $validated['quiz_types'];
        $allCards    = $cards->shuffle();
        $questions   = [];

        foreach ($allCards as $card) {
            // Determine which type to generate for this card
            $available = $quizTypes;

            // Cloze only works on cards with {{}} syntax
            if (! $card->has_cloze) {
                $available = array_values(array_diff($available, ['cloze']));
            }
            if (empty($available)) {
                continue;
            }

            $type = $available[array_rand($available)];

            $question = match ($type) {
                'mc'             => $this->buildMc($card, $allCards),
                'tf'             => $this->buildTf($card),
                'identification' => $this->buildIdentification($card),
                'cloze'          => $this->buildCloze($card),
                default          => null,
            };

            if ($question) {
                $questions[] = array_merge($question, [
                    'card_public_id' => $card->public_id,
                    'card_id'        => $card->id,
                    'category_tag'   => $card->category_tag,
                ]);
            }
        }

        if (empty($questions)) {
            throw ValidationException::withMessages(['deck' => 'Could not generate any questions for the selected types.']);
        }

        $session = DB::transaction(function () use ($deck, $userId, $quizTypes, $questions) {
            $session = FlashcardQuizSession::create([
                'deck_id'          => $deck->id,
                'student_user_id'  => $userId,
                'quiz_types'       => $quizTypes,
                'total_questions'  => count($questions),
                'correct_count'    => 0,
                'is_graded'        => $deck->is_graded,
                'status'           => 'in_progress',
            ]);

            foreach ($questions as $q) {
                FlashcardQuizAnswer::create([
                    'session_id'    => $session->id,
                    'card_id'       => $q['card_id'],
                    'question_type' => $q['type'],
                    'question_data' => $q['question_data'],
                    'correct_answer'=> $q['correct_answer'],
                ]);
            }

            return $session;
        });

        // Return session with questions (strip internal card_id before sending)
        $sessionData = $session->fresh(['answers']);
        $questionsForClient = collect($questions)->map(fn($q) => [
            'card_public_id' => $q['card_public_id'],
            'type'           => $q['type'],
            'question_data'  => $q['question_data'],
            'correct_answer' => $q['correct_answer'],
            'category_tag'   => $q['category_tag'] ?? null,
        ])->values();

        return response()->json([
            'session_public_id' => $session->public_id,
            'is_graded'         => $session->is_graded,
            'total_questions'   => $session->total_questions,
            'questions'         => $questionsForClient,
        ], 201);
    }

    /**
     * Submit answers for a quiz session and compute score.
     */
    public function submitQuiz(Request $request, string $sessionPublicId): JsonResponse
    {
        $userId  = $request->user()->id;
        $session = FlashcardQuizSession::where('public_id', $sessionPublicId)
            ->where('student_user_id', $userId)
            ->where('status', 'in_progress')
            ->firstOrFail();

        $validated = $request->validate([
            'answers'            => 'required|array',
            'answers.*.card_public_id' => 'required|string',
            'answers.*.answer'   => 'nullable|string',
        ]);

        $answerMap = collect($validated['answers'])->keyBy('card_public_id');
        $answers   = FlashcardQuizAnswer::where('session_id', $session->id)
            ->with('card:id,public_id')
            ->get();

        $correctCount = 0;

        DB::transaction(function () use ($answers, $answerMap, $session, &$correctCount, $userId) {
            foreach ($answers as $answer) {
                $cardPublicId  = $answer->card->public_id;
                $studentAnswer = trim($answerMap->get($cardPublicId)['answer'] ?? '');
                $isCorrect     = $this->checkAnswer($answer->question_type, $answer->correct_answer, $studentAnswer);

                $answer->update([
                    'student_answer' => $studentAnswer,
                    'is_correct'     => $isCorrect,
                ]);

                if ($isCorrect) {
                    $correctCount++;
                }

                // Update SR log based on correctness
                $card = $answer->card;
                $log  = FlashcardSrLog::firstOrNew(
                    ['user_id' => $userId, 'card_id' => $card->id],
                    ['ease_factor' => 2.50, 'interval_days' => 1, 'repetitions' => 0, 'next_due' => now()->toDateString()]
                );
                $log->applyRating($isCorrect ? 2 : 0); // Easy if correct, Hard if not
                $log->save();
            }

            $session->update([
                'correct_count' => $correctCount,
                'status'        => 'completed',
                'completed_at'  => now(),
            ]);
        });

        return response()->json([
            'session_public_id' => $session->public_id,
            'correct_count'     => $correctCount,
            'total_questions'   => $session->total_questions,
            'score_percent'     => $session->fresh()->score_percent,
            'is_graded'         => $session->is_graded,
            'question_results'  => $answers->map(fn($a) => [
                'card_public_id' => $a->card->public_id,
                'is_correct'     => (bool) $a->is_correct,
                'student_answer' => $a->student_answer ?? '',
                'correct_answer' => $a->correct_answer,
                'question_data'  => $a->question_data,
                'question_type'  => $a->question_type,
            ])->values(),
        ]);
    }

    // ── Import shared deck (student side) ─────────────────────────────────────

    public function importShared(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:json|max:2048',
        ]);

        $content = file_get_contents($request->file('file')->getPathname());
        $data    = json_decode($content, true);

        if (! $data || ($data['format'] ?? '') !== 'svhs-flashcard-v1') {
            throw ValidationException::withMessages(['file' => 'Invalid deck file format.']);
        }

        $deck = DB::transaction(function () use ($data, $request) {
            $deck = FlashcardDeck::create([
                'owner_user_id' => $request->user()->id,
                'title'         => '[Shared] ' . ($data['title'] ?? 'Untitled'),
                'description'   => $data['description'] ?? null,
                'tags'          => $data['tags'] ?? [],
                'is_graded'     => false, // student imports are always self-study
            ]);

            foreach (($data['cards'] ?? []) as $i => $card) {
                FlashcardCard::create([
                    'deck_id'      => $deck->id,
                    'front'        => $card['front'],
                    'back'         => $card['back'] ?? null,
                    'category_tag' => $card['category_tag'] ?? null,
                    'has_cloze'    => $card['has_cloze'] ?? str_contains($card['front'], '{{'),
                    'sort_order'   => $i,
                ]);
            }

            return $deck;
        });

        return response()->json(['data' => $deck->load('cards')], 201);
    }

    // ── Question Builders ─────────────────────────────────────────────────────

    private function buildMc(FlashcardCard $card, $allCards): array
    {
        $distractors = $allCards
            ->where('id', '!=', $card->id)
            ->shuffle()
            ->take(3)
            ->pluck('back')
            ->filter()
            ->values()
            ->toArray();

        $options = array_merge([$card->back], $distractors);
        shuffle($options);

        return [
            'type'           => 'mc',
            'correct_answer' => $card->back ?? '',
            'question_data'  => [
                'question' => $card->front,
                'options'  => array_values(array_unique($options)),
            ],
        ];
    }

    private function buildTf(FlashcardCard $card): array
    {
        $isTrue  = (bool) random_int(0, 1);
        $answer  = $isTrue ? 'True' : 'False';
        $shown   = $isTrue ? $card->back : 'NOT: ' . $card->back;

        return [
            'type'           => 'tf',
            'correct_answer' => $answer,
            'question_data'  => [
                'question'  => $card->front,
                'statement' => $shown,
            ],
        ];
    }

    private function buildIdentification(FlashcardCard $card): array
    {
        return [
            'type'           => 'identification',
            'correct_answer' => $card->back ?? '',
            'question_data'  => ['question' => $card->front],
        ];
    }

    private function buildCloze(FlashcardCard $card): array
    {
        $answer  = $card->cloze_answer ?? '';
        $blanked = preg_replace('/\{\{.+?\}\}/', '______', $card->front);

        return [
            'type'           => 'cloze',
            'correct_answer' => $answer,
            'question_data'  => ['question' => $blanked],
        ];
    }

    // ── Answer Checking ────────────────────────────────────────────────────────

    private function checkAnswer(string $type, string $correct, string $student): bool
    {
        $correct = mb_strtolower(trim($correct));
        $student = mb_strtolower(trim($student));

        return match ($type) {
            'mc'             => $correct === $student,
            'tf'             => $correct === $student,
            'identification' => $this->fuzzyMatch($correct, $student),
            'cloze'          => $this->fuzzyMatch($correct, $student),
            default          => false,
        };
    }

    /**
     * Accept answer if Levenshtein distance is ≤ 2 (typo tolerance for identification/cloze).
     */
    private function fuzzyMatch(string $correct, string $student): bool
    {
        if ($correct === $student) {
            return true;
        }
        if (abs(strlen($correct) - strlen($student)) > 3) {
            return false;
        }
        return levenshtein($correct, $student) <= 2;
    }
}
