<?php

namespace Database\Seeders\Mock;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * MockClinicCustodianSeeder
 *
 * Seeds:
 *  - student_health_records     (one per active student, ~30% have conditions)
 *  - clinic_visits              (~8% of students visit the clinic 1-4 times)
 *  - health_incidents           (~2% of students have an incident)
 *  - property_categories        (8 categories)
 *  - property_items             (~120 fixed assets across all rooms/areas)
 *  - consumable_categories      (6 categories)
 *  - consumable_items           (~40 consumable items with stock levels)
 *  - consumable_transactions    (receiving + issuances for each item)
 *  - facilities                 (8 school facilities)
 *  - facility_bookings          (~30 bookings spread over the school year)
 */
class MockClinicCustodianSeeder extends Seeder
{
    private const SY = '2025-2026';
    private const CHUNK = 100;

    // ── Clinic complaints / diagnoses ────────────────────────────────────────
    private const COMPLAINTS = [
        'Headache', 'Stomachache', 'Fever', 'Toothache', 'Dizziness',
        'Nausea', 'Cough and colds', 'Skin irritation', 'Eye irritation',
        'Sprained ankle', 'Minor cut', 'Insect bite', 'Allergic reaction',
        'Fatigue', 'Menstrual cramps', 'Asthma attack (mild)',
        'Abdominal pain', 'Back pain', 'Ear pain', 'Lip/mouth sores',
    ];

    private const DIAGNOSES = [
        'Tension headache', 'Gastritis (mild)', 'Low-grade fever', 'Dental caries',
        'Benign paroxysmal positional vertigo', 'Acute gastroenteritis (mild)',
        'Upper respiratory tract infection', 'Contact dermatitis', 'Allergic conjunctivitis',
        'Ankle sprain – Grade I', 'Laceration (minor)', 'Insect bite reaction',
        'Drug/food allergy (mild)', 'Fatigue – no fever', 'Dysmenorrhea (primary)',
        'Bronchial asthma (mild intermittent)', 'IBS (mild)', 'Low back strain',
        'Otitis externa (mild)', 'Aphthous ulcer',
    ];

    private const TREATMENTS = [
        'Rest and observation', 'Oral rehydration', 'Cold compress applied',
        'Wound cleaned and bandaged', 'Antihistamine given per standing order',
        'Pain reliever given per standing order', 'Referred to physician',
        'Nebulization performed', 'Ice pack applied', 'Warm compress applied',
        'Eye wash performed', 'Advised to rest in clinic',
    ];

    private const MEDICINES = [
        'Paracetamol 500mg', 'Mefenamic acid 250mg', 'Cetirizine 10mg',
        'Ibuprofen 200mg', 'Loperamide 2mg', 'ORS sachet',
        'Povidone iodine solution', 'Betadine ointment',
        'Salbutamol nebulization', 'Antacid tablet', 'Cough syrup (OTC)',
        'None dispensed',
    ];

    // ── Property categories and items ────────────────────────────────────────
    private const PROPERTY_CATEGORIES = [
        ['Office Equipment', 'Computers, printers, and other office machines'],
        ['Furniture and Fixtures', 'Desks, chairs, cabinets, and tables'],
        ['Laboratory Equipment', 'Science and computer lab instruments'],
        ['Audio-Visual Equipment', 'Projectors, screens, speakers, and TVs'],
        ['Physical Education Equipment', 'Sports and athletics equipment'],
        ['Medical/Clinic Equipment', 'Clinic instruments and medical devices'],
        ['Security Equipment', 'CCTV, locks, intercoms, and alarms'],
        ['Maintenance Tools', 'Cleaning, repair, and janitorial tools'],
    ];

    private const PROPERTY_ITEMS = [
        // Office Equipment
        ['Desktop Computer', 'Office Equipment', 'Dell', 'OptiPlex 3090', 'Good', 'Teachers Lounge', 18500.00, 5],
        ['Laptop Computer', 'Office Equipment', 'Lenovo', 'IdeaPad 3', 'Good', 'Admin Office', 32000.00, 5],
        ['Printer (Inkjet)', 'Office Equipment', 'Epson', 'L3210', 'Good', 'Admin Office', 6500.00, 3],
        ['Printer (Laser)', 'Office Equipment', 'HP', 'LaserJet Pro M15w', 'Good', 'Registrar Office', 7200.00, 3],
        ['Photocopier', 'Office Equipment', 'Canon', 'IR2206N', 'Fair', 'Reprographics Room', 45000.00, 7],
        ['Document Scanner', 'Office Equipment', 'Fujitsu', 'ScanSnap iX1300', 'Good', 'Admin Office', 12000.00, 4],
        ['Telephone Set', 'Office Equipment', 'Panasonic', 'KX-TS500', 'Good', 'Front Office', 1800.00, 3],
        // Furniture
        ['Steel Cabinet (4-drawer)', 'Furniture and Fixtures', 'Steelman', '', 'Good', 'Registrar Office', 4500.00, 7],
        ['Teacher\'s Table', 'Furniture and Fixtures', 'Local', '', 'Good', 'Room 101', 2500.00, 7],
        ['Student Desk-Chair', 'Furniture and Fixtures', 'Local', '', 'Good', 'Room 101', 800.00, 5],
        ['Plastic Monobloc Chair', 'Furniture and Fixtures', 'Lifetime', '', 'Fair', 'Library', 350.00, 5],
        ['Wooden Bookshelf', 'Furniture and Fixtures', 'Local', '', 'Good', 'Library', 3200.00, 7],
        ['Conference Table', 'Furniture and Fixtures', 'Local', '', 'Good', 'Conference Room', 12000.00, 10],
        ['Whiteboard (4x8 ft)', 'Furniture and Fixtures', 'Quartet', '', 'Good', 'Room 102', 3500.00, 7],
        // Laboratory Equipment
        ['Microscope (student grade)', 'Laboratory Equipment', 'AmScope', 'B120C', 'Good', 'Science Lab', 8500.00, 7],
        ['Electronic Balance', 'Laboratory Equipment', 'Ohaus', 'Scout', 'Good', 'Science Lab', 6200.00, 5],
        ['Bunsen Burner', 'Laboratory Equipment', 'Generic', '', 'Good', 'Science Lab', 850.00, 5],
        ['Desktop Computer (Lab)', 'Laboratory Equipment', 'Acer', 'Aspire TC', 'Good', 'Computer Lab', 21000.00, 5],
        ['UPS (650VA)', 'Laboratory Equipment', 'APC', 'BX650CI', 'Good', 'Computer Lab', 2800.00, 3],
        // Audio-Visual
        ['LCD Projector', 'Audio-Visual Equipment', 'Epson', 'EB-W51', 'Good', 'Room 201', 28000.00, 5],
        ['Projection Screen (pull-down)', 'Audio-Visual Equipment', 'Generic', '', 'Good', 'Room 201', 3500.00, 7],
        ['Smart TV 55"', 'Audio-Visual Equipment', 'Samsung', 'UN55TU7000', 'Good', 'Library', 28000.00, 5],
        ['Bluetooth Speaker', 'Audio-Visual Equipment', 'JBL', 'Xtreme 2', 'Good', 'Gymnasium', 7500.00, 5],
        ['Wireless Microphone', 'Audio-Visual Equipment', 'Shure', 'BLX24/PG58', 'Good', 'Auditorium', 9000.00, 5],
        // PE Equipment
        ['Basketball', 'Physical Education Equipment', 'Spalding', 'Street', 'Good', 'Gymnasium', 1200.00, 3],
        ['Volleyball', 'Physical Education Equipment', 'Mikasa', 'V200W', 'Good', 'Gymnasium', 1800.00, 3],
        ['Badminton Racket Set', 'Physical Education Equipment', 'Li-Ning', '', 'Good', 'Gymnasium', 2500.00, 3],
        ['Table Tennis Set', 'Physical Education Equipment', 'Stiga', '', 'Fair', 'Recreation Room', 3200.00, 3],
        ['First Aid Kit (PE)', 'Physical Education Equipment', 'Generic', '', 'Good', 'Gymnasium', 750.00, 3],
        // Medical
        ['Sphygmomanometer', 'Medical/Clinic Equipment', 'Omron', 'HEM-8712', 'Good', 'Clinic', 2500.00, 5],
        ['Stethoscope', 'Medical/Clinic Equipment', 'Littmann', 'Classic II SE', 'Good', 'Clinic', 4800.00, 5],
        ['Thermometer (infrared)', 'Medical/Clinic Equipment', 'Braun', 'ThermoScan 7', 'Good', 'Clinic', 3200.00, 3],
        ['Nebulizer', 'Medical/Clinic Equipment', 'Omron', 'NE-C28P', 'Good', 'Clinic', 5500.00, 5],
        ['Weighing Scale', 'Medical/Clinic Equipment', 'Tanita', 'BC-401', 'Good', 'Clinic', 3800.00, 5],
        // Security
        ['CCTV Camera (Dome)', 'Security Equipment', 'Hikvision', 'DS-2CD2143G2-I', 'Good', 'Main Gate', 4500.00, 5],
        ['Network Video Recorder', 'Security Equipment', 'Hikvision', 'DS-7108NI-Q1', 'Good', 'Admin Office', 8500.00, 5],
        ['RFID Reader', 'Security Equipment', 'ZKTeco', 'ZK-C3-400', 'Good', 'Main Entrance', 12000.00, 5],
        // Maintenance
        ['Industrial Vacuum Cleaner', 'Maintenance Tools', 'Kärcher', 'WD3', 'Good', 'Custodian Room', 6500.00, 5],
        ['Floor Polisher', 'Maintenance Tools', 'Buffalo', '', 'Fair', 'Custodian Room', 5800.00, 5],
        ['Pressure Washer', 'Maintenance Tools', 'BOSCH', 'Easy Aquatak 110', 'Good', 'Custodian Room', 8200.00, 5],
    ];

    // ── Consumable items ─────────────────────────────────────────────────────
    private const CONSUMABLE_CATEGORIES = [
        ['Office Supplies', 'pcs', 'Papers, pens, folders, and other office consumables'],
        ['Janitorial Supplies', 'pack', 'Cleaning agents and janitorial materials'],
        ['Laboratory Consumables', 'pcs', 'Reagents, slides, and lab materials'],
        ['Medical/Clinic Supplies', 'pcs', 'First aid and clinic consumables'],
        ['Art and Craft Supplies', 'pcs', 'Art materials used in classrooms'],
        ['Printing Supplies', 'pcs', 'Ink cartridges, toners, and printer paper'],
    ];

    private const CONSUMABLE_ITEMS = [
        // Office Supplies
        ['Bond Paper (Short, 70gsm)', 'Office Supplies', 'ream', 250, 20],
        ['Bond Paper (Long, 70gsm)', 'Office Supplies', 'ream', 150, 15],
        ['Ballpoint Pen (Blue)', 'Office Supplies', 'pcs', 500, 50],
        ['Ballpoint Pen (Red)', 'Office Supplies', 'pcs', 200, 30],
        ['Pencil (No. 2)', 'Office Supplies', 'pcs', 300, 50],
        ['Highlighter (Assorted)', 'Office Supplies', 'pcs', 100, 20],
        ['Folder (Long, Plastic)', 'Office Supplies', 'pcs', 200, 30],
        ['Staple Wire No. 35', 'Office Supplies', 'box', 50, 10],
        ['Scotch Tape (1 inch)', 'Office Supplies', 'rolls', 80, 15],
        ['Masking Tape', 'Office Supplies', 'rolls', 60, 10],
        ['Sticky Notes (3x3)', 'Office Supplies', 'pads', 100, 20],
        ['Whiteboard Marker (Black)', 'Office Supplies', 'pcs', 200, 30],
        // Janitorial
        ['Dishwashing Liquid', 'Janitorial Supplies', 'bottle', 100, 20],
        ['Floor Wax (Paste)', 'Janitorial Supplies', 'can', 30, 5],
        ['Toilet Bowl Cleaner', 'Janitorial Supplies', 'bottle', 80, 15],
        ['Garbage Bag (Large)', 'Janitorial Supplies', 'roll', 100, 20],
        ['Broom (Soft)', 'Janitorial Supplies', 'pcs', 20, 5],
        ['Mop Head', 'Janitorial Supplies', 'pcs', 15, 5],
        // Lab consumables
        ['Laboratory Gloves (Medium)', 'Laboratory Consumables', 'box', 40, 5],
        ['Microscope Slides', 'Laboratory Consumables', 'box', 20, 3],
        ['Cover Slips', 'Laboratory Consumables', 'box', 20, 3],
        ['Litmus Paper (Red/Blue)', 'Laboratory Consumables', 'box', 10, 2],
        // Medical/Clinic
        ['Alcohol 70% (500ml)', 'Medical/Clinic Supplies', 'bottle', 50, 10],
        ['Cotton Balls', 'Medical/Clinic Supplies', 'bag', 30, 5],
        ['Bandage (Sterile)', 'Medical/Clinic Supplies', 'pcs', 100, 20],
        ['Paracetamol 500mg', 'Medical/Clinic Supplies', 'tablet', 500, 100],
        ['Antacid Tablet', 'Medical/Clinic Supplies', 'tablet', 300, 50],
        ['ORS Sachet', 'Medical/Clinic Supplies', 'pcs', 100, 20],
        // Art Supplies
        ['Colored Paper (Assorted)', 'Art and Craft Supplies', 'pack', 60, 10],
        ['Ruler (30cm Plastic)', 'Art and Craft Supplies', 'pcs', 100, 20],
        ['Poster Color Set', 'Art and Craft Supplies', 'set', 40, 5],
        // Printing
        ['Ink Cartridge (Black)', 'Printing Supplies', 'pcs', 30, 5],
        ['Ink Cartridge (Color)', 'Printing Supplies', 'pcs', 20, 3],
        ['Laser Toner (Black)', 'Printing Supplies', 'pcs', 15, 3],
    ];

    // ── Facilities ───────────────────────────────────────────────────────────
    private const FACILITIES = [
        ['Main Gymnasium', 'Multi-purpose gymnasium for sports and events', 'Building A', 800, 'Available'],
        ['Auditorium', 'Main auditorium for graduations and programs', 'Building B', 600, 'Available'],
        ['Science Laboratory', 'Fully equipped science laboratory', 'Building C, Room 301', 40, 'Available'],
        ['Computer Laboratory', 'Air-conditioned computer lab with 40 workstations', 'Building C, Room 302', 40, 'Available'],
        ['Library', 'School library with reading area and digital resources', 'Building B, Ground Floor', 100, 'Available'],
        ['Conference Room', 'Meeting room for faculty and administrative staff', 'Admin Building', 30, 'Available'],
        ['Home Economics Room', 'Kitchen and food laboratory for HE strand', 'Building D', 35, 'Available'],
        ['AVR (Audio-Visual Room)', 'Projection room for films and presentations', 'Building B, 2nd Floor', 60, 'Available'],
    ];

    // ── Entry point ──────────────────────────────────────────────────────────

    public function run(): void
    {
        $adminUserId = DB::table('users')->where('access', 'Administrator')->value('id') ?? 1;
        $clinicUserId = DB::table('users')->where('username', 'admin')->value('id') ?? 1;

        $this->command->info("  Seeding health records…");
        $this->seedHealthRecords($clinicUserId);

        $this->command->info("  Seeding clinic visits…");
        $this->seedClinicVisits($clinicUserId);

        $this->command->info("  Seeding health incidents…");
        $this->seedHealthIncidents($clinicUserId);

        $this->command->info("  Seeding property categories & items…");
        $this->seedPropertyItems($adminUserId);

        $this->command->info("  Seeding consumable items & transactions…");
        $this->seedConsumables($adminUserId);

        $this->command->info("  Seeding facilities & bookings…");
        $this->seedFacilities($adminUserId);
    }

    // ── Health records ───────────────────────────────────────────────────────

    private function seedHealthRecords(int $userId): void
    {
        if (DB::table('student_health_records')->count() > 500) {
            $this->command->line("  ⊘ Health records already seeded, skipping.");
            return;
        }

        $students = DB::table('students')
            ->where('schoolYear', self::SY)
            ->where('status', 'Enrolled')
            ->pluck('reg_id');

        $batch = [];
        $bloodTypes = MockNames::$bloodTypes;

        foreach ($students as $regId) {
            if (DB::table('student_health_records')->where('student_id', $regId)->exists()) {
                continue;
            }

            $hasCondition = mt_rand(1, 100) <= 30;
            $hasAllergy   = mt_rand(1, 100) <= 20;
            $hasMeds      = mt_rand(1, 100) <= 10;

            $batch[] = [
                'public_id'         => Str::random(20),
                'student_id'        => $regId,
                'blood_type'        => $bloodTypes[mt_rand(0, count($bloodTypes) - 1)],
                'height_cm'         => mt_rand(120, 178) + (mt_rand(0, 9) / 10),
                'weight_kg'         => mt_rand(30, 85) + (mt_rand(0, 9) / 10),
                'vision_left'       => (mt_rand(0, 1) === 0) ? '20/20' : '20/40',
                'vision_right'      => (mt_rand(0, 1) === 0) ? '20/20' : '20/40',
                'hearing_left'      => 'Normal',
                'hearing_right'     => 'Normal',
                'medical_conditions'=> $hasCondition ? $this->randCondition() : null,
                'allergies'         => $hasAllergy ? $this->randAllergy() : null,
                'current_medications' => $hasMeds ? $this->randMedication() : null,
                'vaccination_records' => json_encode([
                    ['vaccine' => 'Hepatitis B', 'date' => '2020-06-15', 'administered_by' => 'RHU'],
                    ['vaccine' => 'MMR', 'date' => '2021-03-10', 'administered_by' => 'School Nurse'],
                ]),
                'last_physical_exam'=> '2025-06-01',
                'philhealth_no'     => '12-' . mt_rand(100000000, 999999999),
                'notes'             => null,
                'created_at'        => now(),
                'updated_at'        => now(),
            ];

            if (count($batch) >= self::CHUNK) {
                DB::table('student_health_records')->insert($batch);
                $batch = [];
            }
        }

        if (!empty($batch)) {
            DB::table('student_health_records')->insert($batch);
        }

        $this->command->line("  ✓ Health records inserted.");
    }

    // ── Clinic visits ────────────────────────────────────────────────────────

    private function seedClinicVisits(int $userId): void
    {
        if (DB::table('clinic_visits')->count() > 200) {
            $this->command->line("  ⊘ Clinic visits already seeded, skipping.");
            return;
        }

        $students = DB::table('students')
            ->where('schoolYear', self::SY)
            ->where('status', 'Enrolled')
            ->pluck('reg_id')
            ->toArray();

        // Pick ~8% of students
        $visitCount = (int) (count($students) * 0.08);
        $selected = array_slice($students, 0, $visitCount);

        $batch = [];
        $baseDate = \Carbon\Carbon::create(2025, 6, 9);

        foreach ($selected as $regId) {
            $visits = mt_rand(1, 4);
            for ($v = 0; $v < $visits; $v++) {
                $visitDate = $baseDate->copy()->addDays(mt_rand(0, 180))->toDateString();
                $complaintIdx = mt_rand(0, count(self::COMPLAINTS) - 1);
                $disposition  = $this->randDisposition();

                $batch[] = [
                    'public_id'       => Str::random(20),
                    'student_id'      => $regId,
                    'visit_date'      => $visitDate,
                    'visit_time'      => mt_rand(7, 15) . ':' . str_pad((string) mt_rand(0, 59), 2, '0', STR_PAD_LEFT) . ':00',
                    'complaint'       => self::COMPLAINTS[$complaintIdx],
                    'diagnosis'       => self::DIAGNOSES[$complaintIdx],
                    'treatment_given' => self::TREATMENTS[mt_rand(0, count(self::TREATMENTS) - 1)],
                    'medicine_given'  => self::MEDICINES[mt_rand(0, count(self::MEDICINES) - 1)],
                    'vital_signs'     => json_encode([
                        'temperature'      => round(36.1 + (mt_rand(0, 30) / 10), 1),
                        'blood_pressure'   => mt_rand(90, 130) . '/' . mt_rand(60, 90),
                        'pulse_rate'       => mt_rand(60, 100),
                        'respiratory_rate' => mt_rand(14, 22),
                    ]),
                    'referred_to'   => ($disposition === 'Referred to Hospital') ? 'Provincial Hospital' : null,
                    'disposition'   => $disposition,
                    'handled_by'    => $userId,
                    'notes'         => null,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ];

                if (count($batch) >= self::CHUNK) {
                    DB::table('clinic_visits')->insert($batch);
                    $batch = [];
                }
            }
        }

        if (!empty($batch)) {
            DB::table('clinic_visits')->insert($batch);
        }

        $this->command->line("  ✓ Clinic visits inserted.");
    }

    // ── Health incidents ─────────────────────────────────────────────────────

    private function seedHealthIncidents(int $userId): void
    {
        if (DB::table('health_incidents')->count() > 50) {
            $this->command->line("  ⊘ Health incidents already seeded, skipping.");
            return;
        }

        $students = DB::table('students')
            ->where('schoolYear', self::SY)
            ->where('status', 'Enrolled')
            ->pluck('reg_id')
            ->toArray();

        $incidentCount = (int) (count($students) * 0.02);
        $selected = array_slice($students, 0, max($incidentCount, 10));

        $types = ['Accident', 'Illness', 'Injury', 'Allergy', 'Other'];
        $locations = ['Classroom', 'Gymnasium', 'Corridor', 'Canteen', 'Comfort Room', 'Staircase', 'Covered Court'];

        $batch = [];
        $baseDate = \Carbon\Carbon::create(2025, 6, 9);

        foreach ($selected as $regId) {
            $dt = $baseDate->copy()->addDays(mt_rand(0, 180))->addHours(mt_rand(7, 16));
            $batch[] = [
                'public_id'             => Str::random(20),
                'student_id'            => $regId,
                'incident_type'         => $types[mt_rand(0, count($types) - 1)],
                'incident_datetime'     => $dt->toDateTimeString(),
                'location'              => $locations[mt_rand(0, count($locations) - 1)],
                'description'           => $this->randIncidentDesc(),
                'first_aid_given'       => 'Cold compress, wound cleaning, and bandaging performed',
                'referred_to_hospital'  => mt_rand(0, 100) <= 10,
                'hospital_name'         => null,
                'witnesses'             => 'Class adviser on duty',
                'reported_by'           => $userId,
                'status'                => (mt_rand(0, 1) === 0) ? 'Closed' : 'Under Follow-up',
                'notes'                 => null,
                'created_at'            => now(),
                'updated_at'            => now(),
            ];
        }

        if (!empty($batch)) {
            DB::table('health_incidents')->insert($batch);
        }

        $this->command->line("  ✓ Health incidents inserted.");
    }

    // ── Property items ───────────────────────────────────────────────────────

    private function seedPropertyItems(int $userId): void
    {
        if (DB::table('property_items')->count() > 20) {
            $this->command->line("  ⊘ Property items already seeded, skipping.");
            return;
        }

        // Categories
        $catMap = [];
        foreach (self::PROPERTY_CATEGORIES as [$name, $desc]) {
            $cat = DB::table('property_categories')->where('name', $name)->first();
            if (!$cat) {
                $id = DB::table('property_categories')->insertGetId([
                    'public_id'   => Str::random(20),
                    'name'        => $name,
                    'description' => $desc,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
                $catMap[$name] = $id;
            } else {
                $catMap[$name] = $cat->id;
            }
        }

        // Items — generate multiple serial numbers for each definition
        $propCounter = 1;
        foreach (self::PROPERTY_ITEMS as [$name, $category, $brand, $model, $condition, $location, $cost, $lifeYears]) {
            $count = mt_rand(1, 5); // 1-5 units of each item
            for ($i = 0; $i < $count; $i++) {
                $propNo = 'SVHS-' . str_pad((string) $propCounter, 5, '0', STR_PAD_LEFT);
                DB::table('property_items')->insertOrIgnore([
                    'public_id'        => Str::random(20),
                    'property_no'      => $propNo,
                    'name'             => $name,
                    'category_id'      => $catMap[$category] ?? null,
                    'brand'            => $brand ?: null,
                    'model'            => $model ?: null,
                    'serial_no'        => 'SN' . strtoupper(Str::random(8)),
                    'condition'        => $condition,
                    'status'           => 'Active',
                    'location'         => $location,
                    'date_acquired'    => \Carbon\Carbon::create(2025, 6, 1)->subDays(mt_rand(0, 1460))->toDateString(),
                    'acquisition_cost' => $cost,
                    'useful_life_years'=> $lifeYears,
                    'assigned_to'      => null,
                    'remarks'          => null,
                    'photo'            => null,
                    'created_at'       => now(),
                    'updated_at'       => now(),
                ]);
                $propCounter++;
            }
        }

        $this->command->line("  ✓ Property items inserted.");
    }

    // ── Consumable items + transactions ──────────────────────────────────────

    private function seedConsumables(int $userId): void
    {
        if (DB::table('consumable_items')->count() > 10) {
            $this->command->line("  ⊘ Consumable items already seeded, skipping.");
            return;
        }

        // Categories
        $catMap = [];
        foreach (self::CONSUMABLE_CATEGORIES as [$name, $unit, $desc]) {
            $cat = DB::table('consumable_categories')->where('name', $name)->first();
            if (!$cat) {
                $id = DB::table('consumable_categories')->insertGetId([
                    'public_id'    => Str::random(20),
                    'name'         => $name,
                    'default_unit' => $unit,
                    'description'  => $desc,
                    'created_at'   => now(),
                    'updated_at'   => now(),
                ]);
                $catMap[$name] = $id;
            } else {
                $catMap[$name] = $cat->id;
            }
        }

        // Items + transactions
        foreach (self::CONSUMABLE_ITEMS as [$name, $category, $unit, $qty, $reorder]) {
            $itemId = DB::table('consumable_items')->insertGetId([
                'public_id'        => Str::random(20),
                'name'             => $name,
                'category_id'      => $catMap[$category] ?? null,
                'unit'             => $unit,
                'quantity_on_hand' => $qty,
                'reorder_point'    => $reorder,
                'location'         => 'Supply Room',
                'description'      => null,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);

            // Beginning balance (in)
            DB::table('consumable_transactions')->insert([
                'public_id'     => Str::random(20),
                'item_id'       => $itemId,
                'type'          => 'in',
                'quantity'      => $qty + mt_rand(20, 100),
                'reference_no'  => 'PO-2025-' . str_pad((string) mt_rand(1, 50), 4, '0', STR_PAD_LEFT),
                'remarks'       => 'Beginning balance / opening stock SY 2025-2026',
                'performed_by'  => $userId,
                'transacted_at' => '2025-06-08 08:00:00',
                'created_at'    => now(),
                'updated_at'    => now(),
            ]);

            // Several issuances simulating weekly use
            $issuances = mt_rand(2, 6);
            $baseDate = \Carbon\Carbon::create(2025, 6, 9);
            for ($w = 0; $w < $issuances; $w++) {
                DB::table('consumable_transactions')->insert([
                    'public_id'     => Str::random(20),
                    'item_id'       => $itemId,
                    'type'          => 'out',
                    'quantity'      => mt_rand(1, max(1, (int)($reorder * 0.5))),
                    'reference_no'  => 'ISS-2025-' . str_pad((string) mt_rand(1, 200), 4, '0', STR_PAD_LEFT),
                    'remarks'       => 'Issued to ' . ['Admin Office', 'Teachers', 'Clinic', 'Laboratory', 'Library'][mt_rand(0, 4)],
                    'performed_by'  => $userId,
                    'transacted_at' => $baseDate->copy()->addWeeks($w + 1)->toDateTimeString(),
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ]);
            }
        }

        $this->command->line("  ✓ Consumable items and transactions inserted.");
    }

    // ── Facilities + bookings ────────────────────────────────────────────────

    private function seedFacilities(int $userId): void
    {
        if (DB::table('facilities')->count() > 3) {
            $this->command->line("  ⊘ Facilities already seeded, skipping.");
            return;
        }

        $facilityIds = [];
        foreach (self::FACILITIES as [$name, $desc, $location, $capacity, $status]) {
            $id = DB::table('facilities')->insertGetId([
                'public_id'   => Str::random(20),
                'name'        => $name,
                'description' => $desc,
                'location'    => $location,
                'capacity'    => (int) $capacity,
                'amenities'   => 'Air conditioning, Sound system, Chairs and tables',
                'status'      => $status,
                'photo'       => null,
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
            $facilityIds[] = $id;
        }

        // 30 facility bookings
        $events = [
            'Mathematics Quiz Bowl', 'Science Fair', 'Basketball Intramurals', 'Cheering Competition',
            'Faculty Meeting', 'PTA General Assembly', 'Graduation Ceremony', 'Foundation Day Program',
            'Buwan ng Wika Celebration', 'Nutrition Month Program', 'Career Orientation Seminar',
            'First Aid Training', 'Anti-Bullying Seminar', 'Earthquake Drill', 'Fire Safety Drill',
            'Student Council Elections', 'Talent Show', 'Bonding Activity', 'Sports Fest Opening',
            'Christmas Program', 'Leadership Training', 'Research Defense', 'Practicum Evaluation',
            'Community Outreach', 'Mass Celebration', 'Recollection Day', 'Award Night',
            'Interschool Debate', 'MAPEH Fair', 'Culminating Activity',
        ];

        $statuses = ['Approved', 'Approved', 'Approved', 'Pending', 'Rejected', 'Cancelled'];
        $baseDate = \Carbon\Carbon::create(2025, 6, 15);

        foreach ($events as $i => $eventTitle) {
            $eventDate = $baseDate->copy()->addDays($i * 5 + mt_rand(0, 4));
            $startHr = mt_rand(7, 14);
            $endHr   = $startHr + mt_rand(1, 4);
            $status  = $statuses[mt_rand(0, count($statuses) - 1)];

            DB::table('facility_bookings')->insert([
                'public_id'       => Str::random(20),
                'facility_id'     => $facilityIds[mt_rand(0, count($facilityIds) - 1)],
                'requested_by'    => $userId,
                'title'           => $eventTitle,
                'purpose'         => "School event: {$eventTitle}",
                'event_date'      => $eventDate->toDateString(),
                'start_time'      => str_pad((string)$startHr, 2, '0', STR_PAD_LEFT) . ':00:00',
                'end_time'        => str_pad((string)min($endHr, 18), 2, '0', STR_PAD_LEFT) . ':00:00',
                'attendee_count'  => mt_rand(30, 400),
                'status'          => $status,
                'approved_by'     => in_array($status, ['Approved']) ? $userId : null,
                'approver_remarks'=> null,
                'notes'           => null,
                'cancelled_at'    => $status === 'Cancelled' ? now() : null,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        $this->command->line("  ✓ Facilities and " . count($events) . " bookings inserted.");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function randCondition(): string
    {
        $conditions = ['Asthma', 'Rhinitis/Allergic Rhinitis', 'Epilepsy (controlled)', 'Diabetes (Type 1)',
            'Hypertension', 'Vision impairment', 'Scoliosis (mild)', 'Anemia', 'Eczema'];
        return $conditions[mt_rand(0, count($conditions) - 1)];
    }

    private function randAllergy(): string
    {
        $allergies = ['Shellfish', 'Eggs', 'Peanuts', 'Plant pollen', 'Dust mites',
            'Penicillin', 'Sulfonamides', 'Aspirin', 'Latex'];
        return $allergies[mt_rand(0, count($allergies) - 1)];
    }

    private function randMedication(): string
    {
        $meds = ['Salbutamol inhaler', 'Montelukast 5mg', 'Cetirizine 10mg daily', 'Metformin 500mg',
            'Valproic acid', 'Amlodipine 5mg', 'Ferrous sulfate daily', 'Vitamin D supplement'];
        return $meds[mt_rand(0, count($meds) - 1)];
    }

    private function randDisposition(): string
    {
        $rand = mt_rand(1, 100);
        return match (true) {
            $rand <= 75 => 'Released',
            $rand <= 88 => 'Sent Home',
            $rand <= 96 => 'Referred to Hospital',
            default     => 'Admitted',
        };
    }

    private function randIncidentDesc(): string
    {
        $descs = [
            'Student fell down the staircase and sustained minor bruising on the right knee.',
            'Student complained of severe headache and was found unresponsive briefly in class.',
            'Student was hit by a basketball during PE class and sustained a sprained wrist.',
            'Student experienced an allergic reaction after consuming food during lunch break.',
            'Student fainted during flag ceremony due to heat exposure.',
            'Student cut their finger while handling laboratory glassware.',
            'Student slipped on wet floor near the canteen area.',
            'Student was involved in a minor altercation and sustained superficial scratches.',
            'Student experienced asthma attack during physical education activity.',
            'Student was stung by an insect while in the school garden area.',
        ];
        return $descs[mt_rand(0, count($descs) - 1)];
    }
}
