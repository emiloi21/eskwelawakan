<?php

namespace Database\Seeders;

use App\Models\CmsSlider;
use App\Models\CmsNews;
use App\Models\CmsEvent;
use App\Models\CmsGalleryAlbum;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CmsSeeder extends Seeder
{
    public function run(): void
    {
        $adminId = User::where('access', 'Administrator')->value('id') ?? 1;

        // ── Hero Sliders ────────────────────────────────────────────
        CmsSlider::insert([
            [
                'title'               => 'Welcome to St. Vincent de Paul School',
                'subtitle'            => 'Nurturing minds, building futures since 1965. Quality Catholic education for every learner.',
                'bg_image'            => null,
                'bg_color'            => '#1e3a5f',
                'bg_overlay_color'    => '#000000',
                'bg_overlay_opacity'  => 45,
                'btn1_label'          => 'Enroll Now',
                'btn1_link'           => '/apply',
                'btn1_variant'        => 'secondary',
                'btn2_label'          => 'Student Portal',
                'btn2_link'           => '/portal-login',
                'btn2_variant'        => 'outline',
                'text_align'          => 'center',
                'sort_order'          => 1,
                'is_active'           => true,
                'created_at'          => now(),
                'updated_at'          => now(),
            ],
            [
                'title'               => 'Enrollment for S.Y. 2026–2027 is Now Open',
                'subtitle'            => 'Secure your slot today for Preschool through Senior High School. Limited slots available!',
                'bg_image'            => null,
                'bg_color'            => '#0f4c35',
                'bg_overlay_color'    => '#000000',
                'bg_overlay_opacity'  => 40,
                'btn1_label'          => 'Apply Online',
                'btn1_link'           => '/apply',
                'btn1_variant'        => 'secondary',
                'btn2_label'          => 'Learn More',
                'btn2_link'           => '/contact',
                'btn2_variant'        => 'outline',
                'text_align'          => 'center',
                'sort_order'          => 2,
                'is_active'           => true,
                'created_at'          => now(),
                'updated_at'          => now(),
            ],
            [
                'title'               => 'Excellence in Academic and Faith Formation',
                'subtitle'            => 'Holistic education rooted in Vincentian values — faith, service, and academic excellence.',
                'bg_image'            => null,
                'bg_color'            => '#4a1942',
                'bg_overlay_color'    => '#000000',
                'bg_overlay_opacity'  => 40,
                'btn1_label'          => 'Our Programs',
                'btn1_link'           => '/contact',
                'btn1_variant'        => 'secondary',
                'btn2_label'          => null,
                'btn2_link'           => null,
                'btn2_variant'        => 'outline',
                'text_align'          => 'center',
                'sort_order'          => 3,
                'is_active'           => true,
                'created_at'          => now(),
                'updated_at'          => now(),
            ],
        ]);

        // ── News Articles ────────────────────────────────────────────
        $newsItems = [
            [
                'title'        => 'SVHS Tops Regional Science Fair 2026',
                'slug'         => 'svhs-tops-regional-science-fair-2026',
                'excerpt'      => 'Three student teams from SVHS brought home gold, silver, and bronze medals at the Regional Science and Technology Fair held last March 20, 2026.',
                'body'         => '<p>Three student teams from St. Vincent de Paul School brought home gold, silver, and bronze medals at the 2026 Regional Science and Technology Fair held at the Division Sports Complex.</p><p>The Gold Medal was awarded to Grade 10 students Maria Santos and Juan dela Cruz for their project titled <em>"Bamboo-Based Water Filtration System for Rural Communities."</em> Silver went to the STEM 11 team for their AI-assisted crop monitoring prototype, while Bronze was claimed by Grade 9 researchers for their study on urban heat island mitigation.</p><p>"We are immensely proud of our students," said Science Department Head Ms. Rivera. "Their dedication and the support of our faculty mentors made this achievement possible."</p><p>The Gold Medal winners will advance to the National Science Fair scheduled in June 2026.</p>',
                'category'     => 'Academic',
                'cover_image'  => null,
                'is_published' => true,
                'published_at' => now()->subDays(10),
                'author_id'    => $adminId,
            ],
            [
                'title'        => 'Enrollment for S.Y. 2026-2027 is Now Open',
                'slug'         => 'enrollment-sy-2026-2027-now-open',
                'excerpt'      => 'Online and walk-in enrollment for all levels is now open. New students may apply through the online portal starting April 1, 2026.',
                'body'         => '<p>St. Vincent de Paul School is pleased to announce that enrollment for School Year 2026–2027 is officially open for all levels — Preschool, Grade School, Junior High School, and Senior High School.</p><h3>Enrollment Schedule</h3><ul><li><strong>Online Applications:</strong> April 1 – May 15, 2026</li><li><strong>Walk-in Enrollment:</strong> April 7 – May 31, 2026 (8:00 AM – 4:00 PM)</li></ul><h3>Requirements</h3><ul><li>Latest Report Card / Form 138</li><li>PSA Birth Certificate (photocopy)</li><li>2x2 ID photos (2 pieces)</li><li>Baptismal Certificate (for Catholic applicants)</li><li>Certificate of Good Moral Character (for transferees)</li></ul><p>For inquiries, please contact the Registrar\'s Office at (02) 8123-4567 or email registrar@svhs.edu.ph.</p>',
                'category'     => 'Announcement',
                'cover_image'  => null,
                'is_published' => true,
                'published_at' => now()->subDays(5),
                'author_id'    => $adminId,
            ],
            [
                'title'        => 'National Achievement Test Results: SVHS Students Excel',
                'slug'         => 'nat-results-svhs-students-excel',
                'excerpt'      => 'SVHS Grade 6 and Grade 10 students recorded a Mean Percentage Score (MPS) of 82.4%, well above the national average of 68.1%.',
                'body'         => '<p>The Department of Education has released the results of the 2025 National Achievement Test (NAT), and St. Vincent de Paul School\'s students have achieved outstanding scores.</p><p>Grade 6 students recorded a Mean Percentage Score (MPS) of <strong>84.2%</strong>, while Grade 10 students achieved an MPS of <strong>80.6%</strong> — both significantly above the national averages of 68.1% and 65.4% respectively.</p><p>Principal Dr. Mendoza attributed the success to the school\'s enhanced review programs, dedicated teachers, and the commitment of students and parents alike. "These results reflect the quality of instruction and the hard work of our entire school community," she said.</p>',
                'category'     => 'Academic',
                'cover_image'  => null,
                'is_published' => true,
                'published_at' => now()->subDays(18),
                'author_id'    => $adminId,
            ],
            [
                'title'        => 'Brigada Eskwela 2026: Community Comes Together for School Beautification',
                'slug'         => 'brigada-eskwela-2026',
                'excerpt'      => 'Parents, alumni, and community partners gathered for the annual Brigada Eskwela activity, repainting classrooms and refurbishing school facilities.',
                'body'         => '<p>Hundreds of parents, alumni, and community partners descended on St. Vincent de Paul School campus last week for the annual Brigada Eskwela — a nationwide initiative calling communities to prepare school buildings for the opening of classes.</p><p>This year\'s activity saw the repainting of 24 classrooms, the installation of new learning corners in the library, and the landscaping of the school\'s main garden. Several local businesses also donated materials and refreshments to volunteers.</p><p>"Brigada Eskwela is a beautiful testament to the bayanihan spirit of our school family," said PTA President Mr. Reyes. "We do this together because we all want the best for our children."</p>',
                'category'     => 'Community',
                'cover_image'  => null,
                'is_published' => true,
                'published_at' => now()->subDays(25),
                'author_id'    => $adminId,
            ],
            [
                'title'        => 'SVHS Basketball Team Clinches Division Championship',
                'slug'         => 'svhs-basketball-team-division-championship',
                'excerpt'      => 'The SVHS Falcons defeated rival school 68-54 in the finals of the DepEd Division Sports Meet, claiming the championship title for the third consecutive year.',
                'body'         => '<p>The SVHS Falcons basketball team clinched the Division Championship title for the third year in a row, defeating rival school Sta. Rosa National High School 68-54 in a thrilling final game held at the Division Gymnasium.</p><p>Team captain Miguel Reyes led the scoring with 24 points, while center Paolo Santos dominated the paint with 15 rebounds and 6 blocked shots. Coach Lim was full of praise for the entire squad: "Every player contributed. This is a team effort and a testament to months of hard work."</p><p>The championship qualifies the Falcons for the Regional Sports Meet next month.</p>',
                'category'     => 'Sports',
                'cover_image'  => null,
                'is_published' => true,
                'published_at' => now()->subDays(32),
                'author_id'    => $adminId,
            ],
        ];

        foreach ($newsItems as $item) {
            CmsNews::create($item);
        }

        // ── Events ───────────────────────────────────────────────────
        $events = [
            [
                'title'       => 'First Day of Classes – S.Y. 2026-2027',
                'description' => 'Opening of classes for all levels. Students must report to their designated classrooms by 7:30 AM in complete uniform.',
                'start_date'  => now()->addMonths(2)->startOfMonth()->addDays(3),
                'end_date'    => now()->addMonths(2)->startOfMonth()->addDays(3),
                'location'    => 'SVHS Campus',
                'category'    => 'Academic',
                'color'       => '#2563eb',
                'is_public'   => true,
            ],
            [
                'title'       => 'Enrollment Deadline – S.Y. 2026-2027',
                'description' => 'Last day for online and walk-in enrollment for all grade levels.',
                'start_date'  => now()->addDays(55),
                'end_date'    => now()->addDays(55),
                'location'    => 'Registrar\'s Office',
                'category'    => 'Announcement',
                'color'       => '#dc2626',
                'is_public'   => true,
            ],
            [
                'title'       => 'Foundation Day Celebration',
                'description' => 'Annual celebration of the school\'s founding anniversary. Program includes Mass, cultural presentations, and recognition of outstanding students and staff.',
                'start_date'  => now()->addDays(20),
                'end_date'    => now()->addDays(21),
                'location'    => 'School Gymnasium',
                'category'    => 'Event',
                'color'       => '#7c3aed',
                'is_public'   => true,
            ],
            [
                'title'       => 'First Quarterly Examination',
                'description' => 'First Quarter examinations for all grade levels. Students must bring permit and valid school ID.',
                'start_date'  => now()->addDays(30),
                'end_date'    => now()->addDays(33),
                'location'    => 'SVHS Campus',
                'category'    => 'Academic',
                'color'       => '#d97706',
                'is_public'   => true,
            ],
            [
                'title'       => 'National Achievement Test (NAT)',
                'description' => 'Mandatory NAT for Grade 6 and Grade 10 students as mandated by DepEd Order.',
                'start_date'  => now()->addDays(45),
                'end_date'    => now()->addDays(45),
                'location'    => 'Designated Classrooms',
                'category'    => 'Academic',
                'color'       => '#059669',
                'is_public'   => true,
            ],
            [
                'title'       => 'Intramurals 2026',
                'description' => '3-day sports festival featuring basketball, volleyball, badminton, chess, and track & field events. All students are encouraged to participate.',
                'start_date'  => now()->addDays(60),
                'end_date'    => now()->addDays(62),
                'location'    => 'School Grounds & Gymnasium',
                'category'    => 'Sports',
                'color'       => '#e11d48',
                'is_public'   => true,
            ],
            [
                'title'       => 'Acquaintance Party',
                'description' => 'Welcome program for new students. Hosted by the Supreme Student Government.',
                'start_date'  => now()->addDays(10),
                'end_date'    => now()->addDays(10),
                'location'    => 'School Gymnasium',
                'category'    => 'Event',
                'color'       => '#0891b2',
                'is_public'   => true,
            ],
        ];

        foreach ($events as $event) {
            CmsEvent::create(array_merge($event, ['created_at' => now(), 'updated_at' => now()]));
        }

        // ── Gallery Albums ────────────────────────────────────────────
        $albums = [
            [
                'title'       => 'Regional Science Fair 2026',
                'slug'        => 'regional-science-fair-2026',
                'description' => 'SVHS students won Gold, Silver, and Bronze medals at the 2026 Regional Science and Technology Fair.',
                'cover_image' => null,
                'event_date'  => now()->subDays(10),
                'sort_order'  => 1,
            ],
            [
                'title'       => 'Brigada Eskwela 2026',
                'slug'        => 'brigada-eskwela-2026',
                'description' => 'Community volunteers helped repaint classrooms and beautify the school campus in preparation for the new school year.',
                'cover_image' => null,
                'event_date'  => now()->subDays(25),
                'sort_order'  => 2,
            ],
            [
                'title'       => 'Graduation Ceremony S.Y. 2025-2026',
                'slug'        => 'graduation-ceremony-sy-2025-2026',
                'description' => 'Commencement exercises for Grade 6, Grade 10, and Grade 12 graduates of S.Y. 2025-2026.',
                'cover_image' => null,
                'event_date'  => now()->subDays(45),
                'sort_order'  => 3,
            ],
            [
                'title'       => 'Division Basketball Championship 2026',
                'slug'        => 'division-basketball-championship-2026',
                'description' => 'The SVHS Falcons claimed the Division championship title for the third consecutive year.',
                'cover_image' => null,
                'event_date'  => now()->subDays(32),
                'sort_order'  => 4,
            ],
        ];

        foreach ($albums as $album) {
            CmsGalleryAlbum::create(array_merge($album, ['created_at' => now(), 'updated_at' => now()]));
        }
    }
}
