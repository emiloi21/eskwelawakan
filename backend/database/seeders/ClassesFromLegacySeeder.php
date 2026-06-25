<?php

namespace Database\Seeders;

use App\Models\ClassModel;
use Illuminate\Database\Seeder;

/**
 * Seeds the classes table with all 2025-2026 classes from the legacy system.
 * Idempotent: skips any class that already matches gradeLevel+strand+section+schoolYear.
 */
class ClassesFromLegacySeeder extends Seeder
{
    private const CLASSES = [
        // Grade School
        ['Nursery',      'N/A',  'N/A', 'Nursery',                    'Grade School'],
        ['Preparatory',  'N/A',  'N/A', 'A',                          'Grade School'],
        ['Preparatory',  'N/A',  'N/A', 'PreKinder',                  'Grade School'],

        // Junior High School
        ['Grade 7',  'N/A', 'N/A', 'St. Augustine',           'Junior High School'],
        ['Grade 7',  'N/A', 'N/A', 'St. Dominic',             'Junior High School'],
        ['Grade 7',  'N/A', 'N/A', 'St. Ignatius of Loyola',  'Junior High School'],
        ['Grade 7',  'N/A', 'N/A', 'St. Therese of Lisieux',  'Junior High School'],
        ['Grade 8',  'N/A', 'N/A', 'St. Joseph the Worker',   'Junior High School'],
        ['Grade 8',  'N/A', 'N/A', 'St. Jude Thaddeus',       'Junior High School'],
        ['Grade 8',  'N/A', 'N/A', 'St. Patricius',           'Junior High School'],
        ['Grade 9',  'N/A', 'N/A', 'St. Blaise',              'Junior High School'],
        ['Grade 9',  'N/A', 'N/A', 'St. Thomas Aquinas',      'Junior High School'],
        ['Grade 10', 'N/A', 'N/A', 'St. Lorenzo Ruiz',        'Junior High School'],
        ['Grade 10', 'N/A', 'N/A', 'St. Sebastian',           'Junior High School'],
        ['Grade 10', 'N/A', 'N/A', 'St. Vincent Ferrer',      'Junior High School'],

        // Senior High School
        ['Grade 11', 'ABM',   'N/A', 'ST. ROSE OF LIMA',          'Senior High School'],
        ['Grade 11', 'HE',    'N/A', 'ST. EZEKIEL MORENO',        'Senior High School'],
        ['Grade 11', 'HUMSS', 'N/A', 'ST. JOHN PAUL',             'Senior High School'],
        ['Grade 11', 'ICT',   'N/A', 'ST. PEDRO CALUNGSOD',       'Senior High School'],
        ['Grade 11', 'STEM',  'N/A', 'ST. MARK',                  'Senior High School'],
        ['Grade 12', 'ABM',   'N/A', 'ST. ANNE MOTHER OF MARY',   'Senior High School'],
        ['Grade 12', 'HE',    'N/A', 'ST. FRANCIS OF ASSISI',     'Senior High School'],
        ['Grade 12', 'HUMSS', 'N/A', 'ST. ANTHONY DE PADUA',      'Senior High School'],
        ['Grade 12', 'ICT',   'N/A', 'St. Michael the Archangel', 'Senior High School'],
        ['Grade 12', 'STEM',  'N/A', 'St. Albert the Great',      'Senior High School'],
    ];

    public function run(): void
    {
        $created = 0;
        $skipped = 0;

        foreach (self::CLASSES as [$grade, $strand, $major, $section, $dept]) {
            $exists = ClassModel::where('gradeLevel', $grade)
                ->where('strand', $strand)
                ->where('section', $section)
                ->where('schoolYear', '2025-2026')
                ->exists();

            if ($exists) {
                $skipped++;
                $this->command->warn("  ⊘ Exists: {$dept} / {$grade} {$strand} / {$section}");
                continue;
            }

            ClassModel::create([
                'gradeLevel'  => $grade,
                'strand'      => $strand,
                'major'       => $major,
                'section'     => $section,
                'dept'        => $dept,
                'adviser_id'  => 0,
                'adviser'     => '-',
                'schoolYear'  => '2025-2026',
                'semester'    => '1st Semester',
            ]);
            $created++;
            $this->command->info("  + {$dept} / {$grade} {$strand} / {$section}");
        }

        $this->command->newLine();
        $this->command->info("Classes seeded. Created: {$created} | Skipped: {$skipped}");
    }
}
