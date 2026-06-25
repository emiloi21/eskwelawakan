<?php

return [
    'name' => env('SCHOOL_NAME', 'St. Vincent High School'),
    'deped_id' => env('SCHOOL_DEPED_ID', '404074'),
    'region' => env('SCHOOL_REGION', 'VI'),
    'division' => env('SCHOOL_DIVISION', 'Negros Occidental'),
    'fiscal_year_start_month' => 6, // June
    'fiscal_year_end_month' => 5,   // May
    'receipt_number_length' => 8,
    'departments' => [
        'GS' => 'Grade School',
        'JHS' => 'Junior High School',
        'SHS' => 'Senior High School',
        'College' => 'College',
    ],
    'grade_levels' => [
        'GS' => ['Nursery', 'Kinder', 'Prep', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
        'JHS' => ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
        'SHS' => ['Grade 11', 'Grade 12'],
    ],
    'shs_strands' => ['STEM', 'ABM', 'HUMSS', 'ICT', 'HE', 'TVL'],
    'semesters' => ['1st Semester', '2nd Semester', 'Summer'],
];
