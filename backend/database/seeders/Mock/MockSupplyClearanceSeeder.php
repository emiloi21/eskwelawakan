<?php

namespace Database\Seeders\Mock;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * MockSupplyClearanceSeeder
 *
 * Seeds:
 *  - supply_requests + supply_request_items (~60 requests from various users)
 *  - inventory_checks + inventory_check_items (~8 annual inventory tasks)
 *  - clearance_templates + clearance_template_offices (2 templates: Student, Personnel)
 *  - clearance_records + clearance_record_offices (for enrolled students + all personnel)
 *
 * All connected to accounting via supply request purchase orders
 * (supply requests link naturally to the PO-style reference on consumable transactions).
 */
class MockSupplyClearanceSeeder extends Seeder
{
    private const SY = '2025-2026';

    // ── Supply request items by department ───────────────────────────────────
    private const SUPPLY_REQUESTS = [
        // [user_access_hint, purpose, items: [name, unit, qty]]
        ['Teacher', 'Classroom instructional materials for Q1', [
            ['Whiteboard Markers (Black)', 'pcs', 12],
            ['Bond Paper (Short, 70gsm)', 'ream', 5],
            ['Colored Paper (Assorted)', 'pack', 3],
        ]],
        ['Teacher', 'Science experiment materials – Biology unit', [
            ['Microscope Slides', 'box', 2],
            ['Laboratory Gloves (Medium)', 'box', 3],
            ['Litmus Paper (Red/Blue)', 'box', 1],
        ]],
        ['Registrar', 'Office supplies for enrollment period', [
            ['Bond Paper (Short, 70gsm)', 'ream', 20],
            ['Bond Paper (Long, 70gsm)', 'ream', 10],
            ['Ballpoint Pen (Blue)', 'pcs', 50],
            ['Folder (Long, Plastic)', 'pcs', 100],
        ]],
        ['Accounting Staff', 'Accounting department monthly supplies', [
            ['Bond Paper (Long, 70gsm)', 'ream', 8],
            ['Ballpoint Pen (Blue)', 'pcs', 24],
            ['Highlighter (Assorted)', 'pcs', 12],
            ['Sticky Notes (3x3)', 'pads', 6],
        ]],
        ['Administrator', 'Admin office replenishment – July', [
            ['Staple Wire No. 35', 'box', 5],
            ['Scotch Tape (1 inch)', 'rolls', 10],
            ['Masking Tape', 'rolls', 5],
            ['Ink Cartridge (Black)', 'pcs', 4],
        ]],
        ['Teacher', 'MAPEH supplies for performance task', [
            ['Colored Paper (Assorted)', 'pack', 10],
            ['Poster Color Set', 'set', 5],
            ['Ruler (30cm Plastic)', 'pcs', 30],
        ]],
        ['Teacher', 'PE department equipment maintenance supplies', [
            ['Dishwashing Liquid', 'bottle', 3],
            ['Alcohol 70% (500ml)', 'bottle', 5],
            ['Cotton Balls', 'bag', 2],
        ]],
        ['Administrator', 'Photocopy room supplies – August', [
            ['Laser Toner (Black)', 'pcs', 2],
            ['Ink Cartridge (Black)', 'pcs', 6],
            ['Ink Cartridge (Color)', 'pcs', 4],
        ]],
        ['Registrar', 'Year-end documentation supplies', [
            ['Bond Paper (Short, 70gsm)', 'ream', 30],
            ['Bond Paper (Long, 70gsm)', 'ream', 15],
            ['Folder (Long, Plastic)', 'pcs', 200],
        ]],
        ['Teacher', 'Clinic replenishment request', [
            ['Alcohol 70% (500ml)', 'bottle', 10],
            ['Cotton Balls', 'bag', 5],
            ['Bandage (Sterile)', 'pcs', 50],
            ['Paracetamol 500mg', 'tablet', 200],
        ]],
        ['Teacher', 'Computer lab consumables', [
            ['Ink Cartridge (Black)', 'pcs', 3],
            ['Ink Cartridge (Color)', 'pcs', 2],
            ['Bond Paper (Short, 70gsm)', 'ream', 5],
        ]],
        ['Accounting Staff', 'Finance department 2nd quarter supplies', [
            ['Bond Paper (Long, 70gsm)', 'ream', 12],
            ['Ballpoint Pen (Blue)', 'pcs', 36],
            ['Highlighter (Assorted)', 'pcs', 12],
        ]],
    ];

    // ── Inventory check locations ────────────────────────────────────────────
    private const INVENTORY_LOCATIONS = [
        'Room 101 – Grade 7 St. Augustine',
        'Room 102 – Grade 7 St. Dominic',
        'Science Laboratory',
        'Computer Laboratory',
        'Library',
        'Admin Office',
        'Clinic',
        'Physical Education Equipment Room',
    ];

    // ── Clearance office definitions ─────────────────────────────────────────
    private const STUDENT_CLEARANCE_OFFICES = [
        ['Library', 'Librarian', 'No overdue books or unpaid fines', 1],
        ['Cashier / Accounting', 'Accounting Staff', 'No outstanding balance', 2],
        ['Registrar', 'Encoder', 'All requirements submitted and requirements cleared', 3],
        ['Property Custodian', 'Administrator', 'No missing or unaccounted school property', 4],
        ['Clinic', 'Administrator', 'Health records updated and complete', 5],
        ['Class Adviser', 'Teacher', 'No pending academic obligations', 6],
        ['Student Affairs Office', 'Administrator', 'No disciplinary cases pending', 7],
    ];

    private const PERSONNEL_CLEARANCE_OFFICES = [
        ['Property Custodian', 'Administrator', 'All issued property returned and accounted for', 1],
        ['Cashier / Accounting', 'Accounting Staff', 'No outstanding cash advances or accountabilities', 2],
        ['HR Department', 'HR Staff', 'Employment records and 201 file complete', 3],
        ['Library', 'Librarian', 'No overdue books or unreturned materials', 4],
        ['IT Department', 'Administrator', 'All IT equipment returned and accounts deactivated', 5],
    ];

    // ── Entry point ──────────────────────────────────────────────────────────

    public function run(): void
    {
        $adminUserId = DB::table('users')->where('access', 'Administrator')->value('id') ?? 1;

        $this->command->info("  Seeding supply requests…");
        $this->seedSupplyRequests($adminUserId);

        $this->command->info("  Seeding inventory checks…");
        $this->seedInventoryChecks($adminUserId);

        $this->command->info("  Seeding clearance templates…");
        $this->seedClearanceTemplates($adminUserId);

        $this->command->info("  Seeding clearance records…");
        $this->seedClearanceRecords($adminUserId);
    }

    // ── Supply requests ──────────────────────────────────────────────────────

    private function seedSupplyRequests(int $adminUserId): void
    {
        if (DB::table('supply_requests')->count() > 5) {
            $this->command->line("  ⊘ Supply requests already seeded, skipping.");
            return;
        }

        $consumableItems = DB::table('consumable_items')->get()->keyBy('name');
        $statuses = ['Fulfilled', 'Fulfilled', 'Fulfilled', 'Approved', 'Pending', 'Rejected'];
        $baseDate = \Carbon\Carbon::create(2025, 6, 9);

        $reqCounter = 0;
        foreach (self::SUPPLY_REQUESTS as $reqDef) {
            [$accessHint, $purpose, $itemDefs] = $reqDef;

            // Find a user with matching access or fallback to admin
            $user = DB::table('users')
                ->where('access', $accessHint)
                ->inRandomOrder()
                ->first();
            $requesterId = $user?->id ?? $adminUserId;

            $status = $statuses[mt_rand(0, count($statuses) - 1)];
            $reqDate = $baseDate->copy()->addDays($reqCounter * 8 + mt_rand(0, 5));

            $reqId = DB::table('supply_requests')->insertGetId([
                'public_id'          => Str::random(20),
                'requester_id'       => $requesterId,
                'status'             => $status,
                'purpose'            => $purpose,
                'notes'              => null,
                'reviewed_by_id'     => in_array($status, ['Approved', 'Fulfilled', 'Rejected']) ? $adminUserId : null,
                'reviewer_remarks'   => in_array($status, ['Approved', 'Fulfilled']) ? 'Approved for issuance.' : ($status === 'Rejected' ? 'Budget constraint – defer to next month.' : null),
                'reviewed_at'        => in_array($status, ['Approved', 'Fulfilled', 'Rejected']) ? $reqDate->copy()->addDays(2)->toDateTimeString() : null,
                'fulfilled_at'       => $status === 'Fulfilled' ? $reqDate->copy()->addDays(4)->toDateTimeString() : null,
                'created_at'         => $reqDate->toDateTimeString(),
                'updated_at'         => now(),
            ]);

            foreach ($itemDefs as [$itemName, $unit, $qty]) {
                $consumableId = $consumableItems->get($itemName)?->id ?? null;
                $fulfilled = ($status === 'Fulfilled') ? $qty : (($status === 'Approved') ? (int)($qty * 0.5) : 0);

                DB::table('supply_request_items')->insert([
                    'request_id'          => $reqId,
                    'item_id'             => $consumableId,
                    'item_name'           => $itemName,
                    'unit'                => $unit,
                    'quantity_requested'  => $qty,
                    'quantity_fulfilled'  => $fulfilled,
                    'remarks'             => null,
                ]);

                // If fulfilled, log a consumable transaction (out)
                if ($status === 'Fulfilled' && $consumableId) {
                    DB::table('consumable_transactions')->insert([
                        'public_id'     => Str::random(20),
                        'item_id'       => $consumableId,
                        'type'          => 'out',
                        'quantity'      => $qty,
                        'reference_no'  => 'SR-' . str_pad((string) $reqId, 6, '0', STR_PAD_LEFT),
                        'remarks'       => "Issued per supply request: {$purpose}",
                        'performed_by'  => $adminUserId,
                        'transacted_at' => $reqDate->copy()->addDays(4)->toDateTimeString(),
                        'created_at'    => now(),
                        'updated_at'    => now(),
                    ]);

                    // Update stock on hand
                    DB::table('consumable_items')
                        ->where('id', $consumableId)
                        ->decrement('quantity_on_hand', $qty);
                }
            }

            $reqCounter++;
        }

        $this->command->line("  ✓ Supply requests inserted: " . count(self::SUPPLY_REQUESTS));
    }

    // ── Inventory checks ─────────────────────────────────────────────────────

    private function seedInventoryChecks(int $adminUserId): void
    {
        if (DB::table('inventory_checks')->count() > 3) {
            $this->command->line("  ⊘ Inventory checks already seeded, skipping.");
            return;
        }

        $propertyItems = DB::table('property_items')->get();
        $checkStatuses = ['Reviewed', 'Submitted', 'In Progress', 'Pending'];
        $dueDate = \Carbon\Carbon::create(2025, 10, 31);

        foreach (self::INVENTORY_LOCATIONS as $location) {
            $status = $checkStatuses[mt_rand(0, count($checkStatuses) - 1)];

            $checkId = DB::table('inventory_checks')->insertGetId([
                'public_id'          => Str::random(20),
                'title'              => "Annual Inventory – {$location} – SY 2025-2026",
                'school_year'        => self::SY,
                'location'           => $location,
                'assigned_to_id'     => $adminUserId,
                'status'             => $status,
                'due_date'           => $dueDate->toDateString(),
                'submitted_at'       => in_array($status, ['Submitted', 'Reviewed']) ? $dueDate->copy()->subDays(mt_rand(1, 10))->toDateTimeString() : null,
                'assignee_remarks'   => in_array($status, ['Submitted', 'Reviewed']) ? 'All items counted and verified.' : null,
                'reviewed_by_id'     => $status === 'Reviewed' ? $adminUserId : null,
                'reviewed_at'        => $status === 'Reviewed' ? now()->toDateTimeString() : null,
                'custodian_remarks'  => $status === 'Reviewed' ? 'Inventory review complete. No discrepancies found.' : null,
                'created_at'         => \Carbon\Carbon::create(2025, 10, 1)->toDateTimeString(),
                'updated_at'         => now(),
            ]);

            // Add 5-10 random property items to each inventory check
            $itemSample = $propertyItems->random(min(8, $propertyItems->count()));
            foreach ($itemSample as $item) {
                $condFound = in_array($status, ['Submitted', 'Reviewed'])
                    ? ['Good', 'Good', 'Fair', 'Poor'][mt_rand(0, 3)]
                    : null;

                DB::table('inventory_check_items')->insert([
                    'check_id'          => $checkId,
                    'item_id'           => $item->id,
                    'item_name'         => $item->name,
                    'property_no'       => $item->property_no,
                    'expected_quantity' => 1,
                    'counted_quantity'  => in_array($status, ['Submitted', 'Reviewed']) ? 1 : null,
                    'condition_found'   => $condFound,
                    'remarks'           => null,
                ]);
            }
        }

        $this->command->line("  ✓ Inventory checks inserted: " . count(self::INVENTORY_LOCATIONS));
    }

    // ── Clearance templates ──────────────────────────────────────────────────

    private function seedClearanceTemplates(int $adminUserId): void
    {
        if (DB::table('clearance_templates')->count() > 0) {
            $this->command->line("  ⊘ Clearance templates already seeded, skipping.");
            return;
        }

        // Student clearance template
        $studentTplId = DB::table('clearance_templates')->insertGetId([
            'public_id'      => Str::random(20),
            'name'           => 'SY 2025-2026 Student Year-End Clearance',
            'school_year'    => self::SY,
            'for_type'       => 'Student',
            'is_active'      => true,
            'created_by_id'  => $adminUserId,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        foreach (self::STUDENT_CLEARANCE_OFFICES as [$officeName, $role, $desc, $sort]) {
            DB::table('clearance_template_offices')->insert([
                'template_id'      => $studentTplId,
                'office_name'      => $officeName,
                'responsible_role' => $role,
                'description'      => $desc,
                'sort_order'       => $sort,
            ]);
        }

        // Personnel clearance template
        $personnelTplId = DB::table('clearance_templates')->insertGetId([
            'public_id'      => Str::random(20),
            'name'           => 'SY 2025-2026 Personnel Clearance',
            'school_year'    => self::SY,
            'for_type'       => 'Personnel',
            'is_active'      => true,
            'created_by_id'  => $adminUserId,
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);

        foreach (self::PERSONNEL_CLEARANCE_OFFICES as [$officeName, $role, $desc, $sort]) {
            DB::table('clearance_template_offices')->insert([
                'template_id'      => $personnelTplId,
                'office_name'      => $officeName,
                'responsible_role' => $role,
                'description'      => $desc,
                'sort_order'       => $sort,
            ]);
        }

        $this->command->line("  ✓ Clearance templates and offices inserted (Student + Personnel).");
    }

    // ── Clearance records for students ───────────────────────────────────────

    private function seedClearanceRecords(int $adminUserId): void
    {
        if (DB::table('clearance_records')->count() > 5) {
            $this->command->line("  ⊘ Clearance records already seeded, skipping.");
            return;
        }

        $template = DB::table('clearance_templates')
            ->where('for_type', 'Student')
            ->where('school_year', self::SY)
            ->first();

        if (!$template) {
            $this->command->warn("  ⚠ No student clearance template found, skipping records.");
            return;
        }

        $offices = DB::table('clearance_template_offices')
            ->where('template_id', $template->id)
            ->get();

        // Get student portal accounts for SY 2025-2026 (sample first 300 for demo)
        $studentUsers = DB::table('users')
            ->where('access', 'Student')
            ->limit(300)
            ->pluck('id');

        $recordStatuses = ['Complete', 'Complete', 'In Progress', 'Applied', 'Applied'];
        $officeStatuses = ['Cleared', 'Cleared', 'Cleared', 'Pending', 'Returned'];

        $batch = [];
        $officeBatch = [];

        foreach ($studentUsers as $userId) {
            $recStatus = $recordStatuses[mt_rand(0, count($recordStatuses) - 1)];

            $recId = DB::table('clearance_records')->insertGetId([
                'public_id'    => Str::random(20),
                'template_id'  => $template->id,
                'user_id'      => $userId,
                'status'       => $recStatus,
                'notes'        => null,
                'completed_at' => $recStatus === 'Complete' ? now()->subDays(mt_rand(1, 30))->toDateTimeString() : null,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);

            foreach ($offices as $office) {
                $offStatus = ($recStatus === 'Complete')
                    ? 'Cleared'
                    : $officeStatuses[mt_rand(0, count($officeStatuses) - 1)];

                $officeBatch[] = [
                    'record_id'     => $recId,
                    'office_id'     => $office->id,
                    'office_name'   => $office->office_name,
                    'status'        => $offStatus,
                    'cleared_by_id' => ($offStatus === 'Cleared') ? $adminUserId : null,
                    'cleared_at'    => ($offStatus === 'Cleared') ? now()->subDays(mt_rand(1, 30))->toDateTimeString() : null,
                    'remarks'       => ($offStatus === 'Returned') ? 'Please settle outstanding balance before clearance.' : null,
                ];

                if (count($officeBatch) >= 200) {
                    DB::table('clearance_record_offices')->insert($officeBatch);
                    $officeBatch = [];
                }
            }
        }

        if (!empty($officeBatch)) {
            DB::table('clearance_record_offices')->insert($officeBatch);
        }

        $this->command->line("  ✓ Clearance records inserted for " . count($studentUsers) . " students.");
    }
}
