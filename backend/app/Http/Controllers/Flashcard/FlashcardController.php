<?php

namespace App\Http\Controllers\Flashcard;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\FlashcardCard;
use App\Models\FlashcardDeck;
use App\Models\FlashcardDeckShare;
use App\Models\FlashcardQuizSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FlashcardController extends Controller
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    private function ownedDeck(Request $request, string $publicId): FlashcardDeck
    {
        return FlashcardDeck::where('public_id', $publicId)
            ->where('owner_user_id', $request->user()->id)
            ->firstOrFail();
    }

    // ── Deck CRUD ──────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = FlashcardDeck::where('owner_user_id', $request->user()->id)
            ->withCount('cards')
            ->with(['shares.class:class_id,gradeLevel,strand,section,schoolYear']);

        if ($search = $request->input('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        $decks = $query->orderByDesc('is_pinned')->orderByDesc('updated_at')->get();

        return response()->json(['data' => $decks]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:200',
            'description' => 'nullable|string|max:2000',
            'tags'        => 'nullable|array|max:3',
            'tags.*'      => 'string|max:50',
            'is_graded'   => 'boolean',
            'cards'       => 'required|array|min:1',
            'cards.*.front'        => 'required|string',
            'cards.*.back'         => 'nullable|string',
            'cards.*.category_tag' => 'nullable|string|max:100',
            'cards.*.has_cloze'    => 'boolean',
        ]);

        $deck = DB::transaction(function () use ($validated, $request) {
            $deck = FlashcardDeck::create([
                'owner_user_id' => $request->user()->id,
                'title'         => $validated['title'],
                'description'   => $validated['description'] ?? null,
                'tags'          => $validated['tags'] ?? [],
                'is_graded'     => $validated['is_graded'] ?? false,
            ]);

            foreach ($validated['cards'] as $i => $cardData) {
                FlashcardCard::create([
                    'deck_id'      => $deck->id,
                    'front'        => $cardData['front'],
                    'back'         => $cardData['back'] ?? null,
                    'category_tag' => $cardData['category_tag'] ?? null,
                    'has_cloze'    => $cardData['has_cloze'] ?? false,
                    'sort_order'   => $i,
                ]);
            }

            return $deck;
        });

        return response()->json(['data' => $deck->load('cards')], 201);
    }

    public function show(Request $request, string $publicId): JsonResponse
    {
        $deck = $this->ownedDeck($request, $publicId);
        $deck->load(['cards', 'shares.class:class_id,gradeLevel,strand,section,schoolYear']);

        return response()->json(['data' => $deck]);
    }

    public function update(Request $request, string $publicId): JsonResponse
    {
        $deck = $this->ownedDeck($request, $publicId);

        $validated = $request->validate([
            'title'       => 'sometimes|required|string|max:200',
            'description' => 'nullable|string|max:2000',
            'tags'        => 'nullable|array|max:3',
            'tags.*'      => 'string|max:50',
            'is_graded'   => 'boolean',
            'is_pinned'   => 'boolean',
            'cards'       => 'sometimes|array|min:1',
            'cards.*.public_id'    => 'nullable|string',
            'cards.*.front'        => 'required|string',
            'cards.*.back'         => 'nullable|string',
            'cards.*.category_tag' => 'nullable|string|max:100',
            'cards.*.has_cloze'    => 'boolean',
        ]);

        DB::transaction(function () use ($deck, $validated) {
            $deck->fill(array_filter($validated, fn($k) => $k !== 'cards', ARRAY_FILTER_USE_KEY));
            $deck->save();

            if (isset($validated['cards'])) {
                $existingIds = $deck->cards->pluck('id', 'public_id');
                $incomingPublicIds = collect($validated['cards'])->pluck('public_id')->filter()->values();

                // Delete cards that were removed
                FlashcardCard::where('deck_id', $deck->id)
                    ->whereNotIn('public_id', $incomingPublicIds)
                    ->delete();

                foreach ($validated['cards'] as $i => $cardData) {
                    if (! empty($cardData['public_id']) && isset($existingIds[$cardData['public_id']])) {
                        FlashcardCard::where('id', $existingIds[$cardData['public_id']])->update([
                            'front'        => $cardData['front'],
                            'back'         => $cardData['back'] ?? null,
                            'category_tag' => $cardData['category_tag'] ?? null,
                            'has_cloze'    => $cardData['has_cloze'] ?? false,
                            'sort_order'   => $i,
                        ]);
                    } else {
                        FlashcardCard::create([
                            'deck_id'      => $deck->id,
                            'front'        => $cardData['front'],
                            'back'         => $cardData['back'] ?? null,
                            'category_tag' => $cardData['category_tag'] ?? null,
                            'has_cloze'    => $cardData['has_cloze'] ?? false,
                            'sort_order'   => $i,
                        ]);
                    }
                }
            }
        });

        return response()->json(['data' => $deck->fresh(['cards', 'shares.class:class_id,gradeLevel,strand,section,schoolYear'])]);
    }

    public function destroy(Request $request, string $publicId): JsonResponse
    {
        $deck = $this->ownedDeck($request, $publicId);
        $deck->delete();

        return response()->json(['message' => 'Deck deleted.']);
    }

    // ── Class Assignment ───────────────────────────────────────────────────────

    public function assign(Request $request, string $publicId): JsonResponse
    {
        $deck = $this->ownedDeck($request, $publicId);

        $validated = $request->validate([
            'class_ids'   => 'required|array|min:1',
            'class_ids.*' => 'integer|exists:classes,class_id',
        ]);

        $assigned = [];
        foreach ($validated['class_ids'] as $classId) {
            FlashcardDeckShare::firstOrCreate(
                ['deck_id' => $deck->id, 'class_id' => $classId],
                ['assigned_by_user_id' => $request->user()->id, 'assigned_at' => now()]
            );
            $assigned[] = $classId;
        }

        return response()->json([
            'message' => 'Deck assigned to ' . count($assigned) . ' class(es).',
            'data'    => $deck->fresh(['shares.class:class_id,gradeLevel,strand,section,schoolYear']),
        ]);
    }

    public function unassign(Request $request, string $publicId, int $classId): JsonResponse
    {
        $deck = $this->ownedDeck($request, $publicId);

        FlashcardDeckShare::where('deck_id', $deck->id)
            ->where('class_id', $classId)
            ->delete();

        return response()->json(['message' => 'Assignment removed.']);
    }

    // ── Export / Import ────────────────────────────────────────────────────────

    public function export(Request $request, string $publicId): JsonResponse
    {
        $deck = $this->ownedDeck($request, $publicId);
        $deck->load('cards');

        $payload = [
            'format'      => 'svhs-flashcard-v1',
            'title'       => $deck->title,
            'description' => $deck->description,
            'tags'        => $deck->tags,
            'is_graded'   => $deck->is_graded,
            'cards'       => $deck->cards->map(fn($c) => [
                'front'        => $c->front,
                'back'         => $c->back,
                'category_tag' => $c->category_tag,
                'has_cloze'    => $c->has_cloze,
                'sort_order'   => $c->sort_order,
            ])->values(),
        ];

        return response()->json($payload)
            ->header('Content-Disposition', 'attachment; filename="' . str_replace(' ', '-', $deck->title) . '.json"');
    }

    public function importJson(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:json|max:5120',
        ]);

        $content = file_get_contents($request->file('file')->getPathname());
        $data    = json_decode($content, true);

        if (! $data) {
            throw ValidationException::withMessages(['file' => 'Invalid JSON file.']);
        }

        // ── svhs-flashcard-v1 (native export) ────────────────────────────────
        if (($data['format'] ?? '') === 'svhs-flashcard-v1') {
            return $this->createDeckFromArray($request, $data);
        }

        // ── kwek format (kwekVersion: 1) ──────────────────────────────────────
        if (isset($data['kwekVersion'], $data['deck'])) {
            $deck  = $data['deck'];
            $cards = [];

            foreach ($deck['cards'] ?? [] as $card) {
                $front = trim($card['front'] ?? '');
                if ($front === '') {
                    continue;
                }
                $cats    = $card['categories'] ?? [];
                $cards[] = [
                    'front'        => $front,
                    'back'         => trim($card['back'] ?? '') ?: null,
                    'category_tag' => ! empty($cats) ? trim($cats[0]) : null,
                    'has_cloze'    => str_contains($front, '{{'),
                ];
            }

            if (empty($cards)) {
                throw ValidationException::withMessages(['file' => 'No valid cards found in kwek deck.']);
            }

            return $this->createDeckFromArray($request, [
                'title'       => trim($deck['name'] ?? '') ?: 'Imported Deck',
                'description' => $deck['description'] ?? null,
                'is_graded'   => false,
                'cards'       => $cards,
            ]);
        }

        throw ValidationException::withMessages(['file' => 'Unsupported format. Upload a svhs-flashcard-v1 .json or a kwek .kwek.json file.']);
    }

    public function importCsv(Request $request): JsonResponse
    {
        $request->validate([
            'file'  => 'required|file|mimes:csv,txt|max:2048',
            'title' => 'required|string|max:200',
        ]);

        $path  = $request->file('file')->getPathname();
        $lines = array_filter(array_map('str_getcsv', file($path)));
        $cards = [];

        foreach ($lines as $i => $row) {
            if ($i === 0 && strtolower(trim($row[0] ?? '')) === 'front') {
                continue; // skip header
            }
            $front = trim($row[0] ?? '');
            $back  = trim($row[1] ?? '');
            if ($front === '') {
                continue;
            }
            $cards[] = [
                'front'        => $front,
                'back'         => $back ?: null,
                'category_tag' => trim($row[2] ?? '') ?: null,
                'has_cloze'    => str_contains($front, '{{'),
            ];
        }

        if (empty($cards)) {
            throw ValidationException::withMessages(['file' => 'No valid cards found in CSV.']);
        }

        return $this->createDeckFromArray($request, [
            'title'     => $request->input('title'),
            'is_graded' => false,
            'cards'     => $cards,
        ], 201);
    }

    public function importPdf(Request $request): JsonResponse
    {
        $request->validate([
            'file'  => 'required|file|mimes:pdf|max:10240',
            'title' => 'required|string|max:200',
        ]);

        // Extract text via smalot/pdfparser
        $parser  = new \Smalot\PdfParser\Parser();
        $pdf     = $parser->parseFile($request->file('file')->getPathname());
        $rawText = $pdf->getText();

        // Naïve line-pair extraction: odd lines = front, even = back
        $lines = array_values(array_filter(
            array_map('trim', preg_split('/\r?\n/', $rawText)),
            fn($l) => $l !== ''
        ));

        $cards = [];
        for ($i = 0; $i + 1 < count($lines); $i += 2) {
            $cards[] = [
                'front'     => $lines[$i],
                'back'      => $lines[$i + 1],
                'has_cloze' => false,
            ];
        }
        // If odd number of lines, last line becomes a cloze card
        if (count($lines) % 2 !== 0 && ! empty($lines)) {
            $last = end($lines);
            $cards[] = ['front' => $last, 'back' => null, 'has_cloze' => false];
        }

        if (empty($cards)) {
            throw ValidationException::withMessages(['file' => 'Could not extract readable text from PDF.']);
        }

        return $this->createDeckFromArray($request, [
            'title'       => $request->input('title'),
            'description' => 'Generated from PDF import.',
            'is_graded'   => false,
            'cards'       => $cards,
        ], 201);
    }

    // ── AI Generation (stub) ──────────────────────────────────────────────────

    public function generateAi(Request $request): JsonResponse
    {
        $request->validate([
            'topic' => 'required|string|max:500',
            'count' => 'integer|min:5|max:50',
        ]);

        $apiKey = env('GEMINI_API_KEY');
        if (empty($apiKey)) {
            return response()->json([
                'message' => 'AI generation is not configured. GEMINI_API_KEY is missing.',
            ], 501);
        }

        $topic = $request->input('topic');
        $count = $request->input('count', 10);

        $prompt = "Generate $count educational flashcards about '$topic'. " .
                  "Return ONLY a raw JSON array (no markdown block) where each element is an object with 'front' (the question or term) and 'back' (the answer or definition).";

        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}", [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature' => 0.7,
                    'responseMimeType' => 'application/json',
                ]
            ]);

            if ($response->failed()) {
                \Illuminate\Support\Facades\Log::error('Gemini API Error: ' . $response->body());
                return response()->json(['message' => 'Failed to generate flashcards via AI.'], 500);
            }

            $data = $response->json();
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
            
            $cards = json_decode($text, true);
            if (!is_array($cards)) {
                return response()->json(['message' => 'Failed to parse AI response.'], 500);
            }

            return response()->json(['cards' => $cards]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('AI Generation Exception: ' . $e->getMessage());
            return response()->json(['message' => 'An error occurred during AI generation.'], 500);
        }
    }

    // ── Quiz Results (graded view for teacher) ─────────────────────────────────

    public function results(Request $request, string $publicId): JsonResponse
    {
        $deck = $this->ownedDeck($request, $publicId);

        $sessions = FlashcardQuizSession::where('deck_id', $deck->id)
            ->where('status', 'completed')
            ->with('student:id,fname,lname,student_id')
            ->orderByDesc('completed_at')
            ->get()
            ->map(fn($s) => [
                'public_id'       => $s->public_id,
                'student'         => $s->student,
                'score_percent'   => $s->score_percent,
                'correct_count'   => $s->correct_count,
                'total_questions' => $s->total_questions,
                'quiz_types'      => $s->quiz_types,
                'is_graded'       => $s->is_graded,
                'completed_at'    => $s->completed_at,
            ]);

        return response()->json(['data' => $sessions]);
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private function createDeckFromArray(Request $request, array $data, int $status = 201): JsonResponse
    {
        $deck = DB::transaction(function () use ($data, $request) {
            $deck = FlashcardDeck::create([
                'owner_user_id' => $request->user()->id,
                'title'         => $data['title'],
                'description'   => $data['description'] ?? null,
                'tags'          => $data['tags'] ?? [],
                'is_graded'     => $data['is_graded'] ?? false,
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

        return response()->json(['data' => $deck->load('cards')], $status);
    }
}
