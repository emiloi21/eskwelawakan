<?php

namespace App\Services\Dss;

use App\Models\DssRecommendation;
use App\Models\EarlyWarning;

class DssRecommendationService
{
    /**
     * Maps each warning_type to a recommendation template.
     */
    private const TEMPLATES = [
        'high_retention_rate' => [
            'category' => 'academic',
            'priority' => 'high',
            'text'     => 'Initiate a grade-level academic intervention program. Coordinate with subject teachers to identify students at risk of retention and provide additional remediation sessions before the end of the school year.',
            'basis'    => 'High retention rate detected for one or more grade levels.',
        ],
        'enrollment_drop' => [
            'category' => 'enrollment',
            'priority' => 'high',
            'text'     => 'Conduct an enrollment drive and outreach campaign targeting the affected grade level. Consider offering flexible payment schemes and community engagement activities to reverse the enrollment decline.',
            'basis'    => 'Enrollment dropped more than 15% compared to the previous school year.',
        ],
        'at_risk_student_surge' => [
            'category' => 'academic',
            'priority' => 'high',
            'text'     => 'Expand the student intervention program and increase teacher advisory sessions. Engage parents of at-risk students through formal conferences and set up a structured monitoring system.',
            'basis'    => 'At-risk student count increased by more than 10% compared to the previous school year.',
        ],
        'overloaded_faculty' => [
            'category' => 'faculty',
            'priority' => 'medium',
            'text'     => 'Review faculty assignment loads and redistribute subject assignments. Consider hiring additional contractual or part-time teachers to bring all faculty within the optimal 18–24 unit load range.',
            'basis'    => 'One or more faculty members are carrying loads exceeding the 24-unit maximum.',
        ],
        'section_overcapacity' => [
            'category' => 'enrollment',
            'priority' => 'medium',
            'text'     => 'Create an additional section for the overcrowded grade level or limit new enrollments until the section capacity is regularized. Coordinate with the registrar and facilities team.',
            'basis'    => 'One or more sections have enrollments exceeding room capacity.',
        ],
        'underutilized_section' => [
            'category' => 'resource',
            'priority' => 'low',
            'text'     => 'Consider consolidating underutilized sections to optimize faculty deployment and classroom usage. Review the section structure for the upcoming school year during pre-enrollment planning.',
            'basis'    => 'One or more sections have fill rates below 50%.',
        ],
        'materials_shortage' => [
            'category' => 'resource',
            'priority' => 'medium',
            'text'     => 'File an immediate purchase request for consumable items below reorder level. Coordinate with the budget office to secure funds and with the custodian to process the procurement.',
            'basis'    => 'One or more consumable items are at or below minimum stock levels.',
        ],
        'subject_failure_spike' => [
            'category' => 'academic',
            'priority' => 'medium',
            'text'     => 'Schedule an academic review session for the affected subject. The department head should meet with the concerned teacher to analyze assessment quality and provide instructional support or remediation.',
            'basis'    => 'One or more subjects have average grades below passing (75) for the current school year.',
        ],
        'referral_backlog' => [
            'category' => 'guidance',
            'priority' => 'high',
            'text'     => 'Assign a guidance counselor to immediately conduct intake interviews for students with 3 or more pending referrals and no active case record. Prioritize high-urgency referrals and open case records without delay to ensure compliance with DepEd Order 36 s.2016.',
            'basis'    => 'One or more students have 3+ pending referrals with no guidance case opened.',
        ],
        'guidance_case_overload' => [
            'category' => 'guidance',
            'priority' => 'medium',
            'text'     => 'Review active guidance cases for the flagged student and consolidate overlapping concerns into a single comprehensive case record. Ensure continuity of counseling services and coordinate with subject teachers and parents as needed.',
            'basis'    => 'One or more students have 2 or more simultaneously active guidance cases in the current school year.',
        ],
        'counselor_overload' => [
            'category' => 'guidance',
            'priority' => 'high',
            'text'     => 'The assigned guidance counselor has exceeded the recommended caseload of 50 active cases. Redistribute cases to available counselors or request additional guidance personnel. Prioritize crisis and urgent cases to prevent service delays.',
            'basis'    => 'A guidance counselor has more than 50 active cases in the current school year.',
        ],
    ];

    /**
     * Generate rule-based recommendations from unacknowledged early warnings.
     * Skips warnings that already have a pending (non-actioned) recommendation.
     *
     * @return int count of recommendations created
     */
    public function generate(int $schoolYearId): int
    {
        $warnings = EarlyWarning::where('is_acknowledged', false)->get();
        $count    = 0;

        foreach ($warnings as $warning) {
            $template = self::TEMPLATES[$warning->warning_type] ?? null;

            if (!$template) {
                continue;
            }

            // Skip if a non-actioned recommendation already exists for this warning
            $alreadyExists = DssRecommendation::where('related_warning_id', $warning->id)
                ->where('is_actioned', false)
                ->exists();

            if ($alreadyExists) {
                continue;
            }

            DssRecommendation::create([
                'recommendation_text' => $template['text'],
                'category'            => $template['category'],
                'priority'            => $template['priority'],
                'basis'               => $template['basis'] . ' (Warning: ' . $warning->message . ')',
                'related_warning_id'  => $warning->id,
            ]);

            $count++;
        }

        return $count;
    }
}
