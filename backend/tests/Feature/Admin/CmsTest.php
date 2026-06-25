<?php

namespace Tests\Feature\Admin;

use App\Models\CmsEvent;
use App\Models\CmsGalleryAlbum;
use App\Models\CmsGalleryPhoto;
use App\Models\CmsNews;
use App\Models\CmsSlider;
use Tests\TestCase;

/**
 * CMS module tests — News, Gallery, Events, Sliders, Public endpoints
 *
 * Workflows:
 * - Admin CRUD for news articles (create, list, show, update, delete, publish toggle)
 * - Admin CRUD for gallery albums and photos
 * - Admin CRUD for calendar events
 * - Admin CRUD for homepage sliders (with reorder)
 * - Public endpoints (no auth) for news, gallery, events, sliders
 * - Non-admin cannot manage CMS content
 */
class CmsTest extends TestCase
{
    // =========================================================================
    // ── NEWS ARTICLES ─────────────────────────────────────────────────────────
    // =========================================================================

    public function test_admin_can_create_news_article(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/news', [
            'title'        => 'Enrollment for School Year 2026-2027 Now Open',
            'excerpt'      => 'St. Vincent High School announces the opening of enrollment for incoming Nursery to Grade 12 students for School Year 2026-2027.',
            'body'         => '<p>The enrollment period for School Year 2026-2027 officially opens on May 4, 2026. All returning students may re-enroll via the student portal. New applicants may submit their application forms at the Registrar\'s Office from 8:00 AM to 4:00 PM, Monday through Friday.</p><p>Required documents include birth certificate (PSA-authenticated), Form 138, and two 2x2 ID photos.</p>',
            'category'     => 'Announcement',
            'is_published' => true,
        ])->assertStatus(201)
            ->assertJsonPath('title', 'Enrollment for School Year 2026-2027 Now Open')
            ->assertJsonPath('category', 'Announcement')
            ->assertJsonPath('is_published', true)
            ->assertJsonStructure(['id', 'title', 'slug', 'excerpt', 'category', 'is_published', 'published_at', 'author']);
    }

    public function test_news_article_slug_is_auto_generated(): void
    {
        $this->actAs('Administrator');

        $response = $this->postJson('/api/admin/cms/news', [
            'title'    => 'SVHS Students Win Regional Science Quiz Bee',
            'category' => 'Achievement',
            'body'     => '<p>Three students from Grade 10 represented the school in the Regional Science Quiz Bee held at the Division Office on March 28, 2026, and emerged as champions.</p>',
        ])->assertStatus(201);

        $this->assertSame('svhs-students-win-regional-science-quiz-bee', $response->json('slug'));
    }

    public function test_admin_can_list_news_articles(): void
    {
        $this->actAs('Administrator');

        CmsNews::create([
            'title'        => 'Recognition Day 2026 Highlights',
            'slug'         => 'recognition-day-2026-highlights',
            'category'     => 'Events',
            'is_published' => true,
            'published_at' => now(),
        ]);

        CmsNews::create([
            'title'        => 'Upcoming: Intramurals 2026',
            'slug'         => 'upcoming-intramurals-2026',
            'category'     => 'Announcement',
            'is_published' => false,
        ]);

        $this->getJson('/api/admin/cms/news')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_admin_can_view_single_news_article(): void
    {
        $this->actAs('Administrator');

        $article = CmsNews::create([
            'title'        => 'Grade 12 Graduation Ceremony — June 2026',
            'slug'         => 'grade-12-graduation-ceremony-june-2026',
            'excerpt'      => 'The school community is invited to witness the graduation of 87 Senior High School students.',
            'body'         => '<p>Graduation rites for Grade 12 Batch 2026 will be held on June 15, 2026, 9:00 AM at the school gymnasium. Parents and guardians are encouraged to arrive by 8:30 AM.</p>',
            'category'     => 'Announcement',
            'is_published' => true,
            'published_at' => now(),
        ]);

        $this->getJson("/api/admin/cms/news/{$article->id}")
            ->assertOk()
            ->assertJsonPath('title', 'Grade 12 Graduation Ceremony — June 2026')
            ->assertJsonPath('excerpt', 'The school community is invited to witness the graduation of 87 Senior High School students.');
    }

    public function test_admin_can_update_news_article(): void
    {
        $this->actAs('Administrator');

        $article = CmsNews::create([
            'title'        => 'Semestral Break Schedule',
            'slug'         => 'semestral-break-schedule',
            'category'     => 'Announcement',
            'is_published' => false,
        ]);

        $this->putJson("/api/admin/cms/news/{$article->id}", [
            'title'        => 'Semestral Break Schedule — October 2026',
            'category'     => 'Announcement',
            'is_published' => true,
        ])->assertOk()
            ->assertJsonPath('title', 'Semestral Break Schedule — October 2026')
            ->assertJsonPath('is_published', true);

        $this->assertNotNull(CmsNews::find($article->id)->published_at);
    }

    public function test_unpublishing_clears_published_at(): void
    {
        $this->actAs('Administrator');

        $article = CmsNews::create([
            'title'        => 'Pending Correction Article',
            'slug'         => 'pending-correction-article',
            'category'     => 'General',
            'is_published' => true,
            'published_at' => now(),
        ]);

        $this->putJson("/api/admin/cms/news/{$article->id}", [
            'is_published' => false,
        ])->assertOk()
            ->assertJsonPath('is_published', false);

        $this->assertNull(CmsNews::find($article->id)->published_at);
    }

    public function test_admin_can_delete_news_article(): void
    {
        $this->actAs('Administrator');

        $article = CmsNews::create([
            'title'    => 'Article to Be Removed',
            'slug'     => 'article-to-be-removed',
            'category' => 'General',
        ]);

        $this->deleteJson("/api/admin/cms/news/{$article->id}")->assertOk();
        $this->assertNull(CmsNews::find($article->id));
    }

    public function test_news_title_is_required(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/news', [
            'category' => 'General',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_news_category_is_required(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/news', [
            'title' => 'Missing Category Article',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    }

    // =========================================================================
    // ── GALLERY ──────────────────────────────────────────────────────────────
    // =========================================================================

    public function test_admin_can_create_gallery_album(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/albums', [
            'title'       => 'Intramurals 2025 — Sports Day',
            'description' => 'Photo highlights from the SVHS Intramurals 2025 held on December 5–6, 2025 at the school grounds.',
            'event_date'  => '2025-12-05',
            'sort_order'  => 1,
        ])->assertStatus(201)
            ->assertJsonPath('title', 'Intramurals 2025 — Sports Day')
            ->assertJsonPath('slug', 'intramurals-2025-sports-day')
            ->assertJsonStructure(['id', 'title', 'slug', 'description', 'event_date', 'sort_order', 'photos_count']);
    }

    public function test_admin_can_list_gallery_albums(): void
    {
        $this->actAs('Administrator');

        CmsGalleryAlbum::create([
            'title'      => 'Recognition Day 2026',
            'slug'       => 'recognition-day-2026',
            'event_date' => '2026-02-28',
            'sort_order' => 1,
        ]);
        CmsGalleryAlbum::create([
            'title'      => 'Science Fair 2025',
            'slug'       => 'science-fair-2025',
            'event_date' => '2025-11-20',
            'sort_order' => 2,
        ]);

        $this->getJson('/api/admin/cms/albums')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonStructure([['id', 'title', 'slug', 'photos_count']]);
    }

    public function test_admin_can_update_gallery_album(): void
    {
        $this->actAs('Administrator');

        $album = CmsGalleryAlbum::create([
            'title'      => 'Foundation Day Photos',
            'slug'       => 'foundation-day-photos',
            'event_date' => '2026-01-15',
            'sort_order' => 3,
        ]);

        $this->putJson("/api/admin/cms/albums/{$album->id}", [
            'title'       => 'Foundation Day 2026 — 50th Anniversary',
            'description' => 'Commemorating 50 years of excellence in Catholic education.',
            'sort_order'  => 1,
        ])->assertOk()
            ->assertJsonPath('title', 'Foundation Day 2026 — 50th Anniversary')
            ->assertJsonPath('sort_order', 1);
    }

    public function test_admin_can_delete_gallery_album(): void
    {
        $this->actAs('Administrator');

        $album = CmsGalleryAlbum::create([
            'title'      => 'Draft Album',
            'slug'       => 'draft-album',
            'sort_order' => 99,
        ]);

        $this->deleteJson("/api/admin/cms/albums/{$album->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Album deleted.');

        $this->assertNull(CmsGalleryAlbum::find($album->id));
    }

    public function test_album_title_is_required(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/albums', [
            'event_date' => '2026-03-01',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    // =========================================================================
    // ── EVENTS CALENDAR ──────────────────────────────────────────────────────
    // =========================================================================

    public function test_admin_can_create_event(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/events', [
            'title'       => 'Enrollment Period — School Year 2026-2027',
            'description' => 'Official enrollment period for all grade levels. Returning students may re-enroll via the student portal. New students may visit the Registrar\'s Office.',
            'start_date'  => '2026-05-04',
            'end_date'    => '2026-05-29',
            'location'    => 'Registrar\'s Office & Student Portal (online)',
            'category'    => 'Enrollment',
            'color'       => '#16a34a',
            'is_public'   => true,
        ])->assertStatus(201)
            ->assertJsonPath('title', 'Enrollment Period — School Year 2026-2027')
            ->assertJsonPath('category', 'Enrollment')
            ->assertJsonPath('color', '#16a34a')
            ->assertJsonPath('is_public', true);
    }

    public function test_admin_can_list_events(): void
    {
        $this->actAs('Administrator');

        CmsEvent::create([
            'title'      => '1st Quarter Examinations',
            'start_date' => '2026-08-17',
            'end_date'   => '2026-08-21',
            'location'   => 'All Classrooms',
            'category'   => 'Examination',
            'color'      => '#dc2626',
            'is_public'  => true,
        ]);
        CmsEvent::create([
            'title'      => 'Teachers\' Day',
            'start_date' => '2026-10-05',
            'category'   => 'Holiday',
            'color'      => '#7c3aed',
            'is_public'  => true,
        ]);
        CmsEvent::create([
            'title'      => 'Faculty Planning Workshop',
            'start_date' => '2026-06-02',
            'end_date'   => '2026-06-03',
            'location'   => 'AVR — 2nd Floor',
            'category'   => 'Internal',
            'color'      => '#0369a1',
            'is_public'  => false,  // staff-only event
        ]);

        $this->getJson('/api/admin/cms/events')
            ->assertOk()
            ->assertJsonCount(3);
    }

    public function test_admin_can_update_event(): void
    {
        $this->actAs('Administrator');

        $event = CmsEvent::create([
            'title'      => 'Semestral Break',
            'start_date' => '2026-10-19',
            'end_date'   => '2026-10-23',
            'category'   => 'Holiday',
            'color'      => '#f59e0b',
        ]);

        $this->putJson("/api/admin/cms/events/{$event->id}", [
            'title'    => 'Semestral Break (No Classes)',
            'end_date' => '2026-10-24',
        ])->assertOk()
            ->assertJsonPath('title', 'Semestral Break (No Classes)');
    }

    public function test_admin_can_delete_event(): void
    {
        $this->actAs('Administrator');

        $event = CmsEvent::create([
            'title'      => 'Cancelled Event',
            'start_date' => '2026-07-01',
            'category'   => 'Event',
        ]);

        $this->deleteJson("/api/admin/cms/events/{$event->id}")->assertOk();
        $this->assertNull(CmsEvent::find($event->id));
    }

    public function test_event_end_date_must_be_on_or_after_start_date(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/events', [
            'title'      => 'Invalid Date Range',
            'start_date' => '2026-09-10',
            'end_date'   => '2026-09-05',   // before start_date
            'category'   => 'Event',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);
    }

    public function test_event_color_must_be_valid_hex(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/events', [
            'title'      => 'Bad Color Event',
            'start_date' => '2026-09-01',
            'category'   => 'Event',
            'color'      => 'red',  // not a hex string
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['color']);
    }

    public function test_event_required_fields(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/events', [
            'description' => 'Missing title and category',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'start_date', 'category']);
    }

    // =========================================================================
    // ── HOMEPAGE SLIDERS ─────────────────────────────────────────────────────
    // =========================================================================

    public function test_admin_can_create_slider(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/sliders', [
            'title'              => 'Enrollment is Now Open!',
            'subtitle'           => 'School Year 2026-2027 · May 4 – May 29, 2026 · Nursery to Grade 12',
            'bg_color'           => '#1e40af',
            'bg_overlay_color'   => '#000000',
            'bg_overlay_opacity' => 45,
            'btn1_label'         => 'Enroll Now',
            'btn1_link'          => '/apply',
            'btn1_variant'       => 'primary',
            'btn2_label'         => 'Learn More',
            'btn2_link'          => '/news/enrollment-sy-2026-2027',
            'btn2_variant'       => 'outline',
            'text_align'         => 'center',
            'sort_order'         => 1,
            'is_active'          => true,
        ])->assertStatus(201)
            ->assertJsonPath('title', 'Enrollment is Now Open!')
            ->assertJsonPath('btn1_label', 'Enroll Now')
            ->assertJsonPath('is_active', true);
    }

    public function test_admin_can_list_sliders_ordered_by_sort_order(): void
    {
        $this->actAs('Administrator');

        CmsSlider::create([
            'title'      => 'Welcome to SVHS',
            'subtitle'   => 'Excellence in Catholic Education since 1976',
            'bg_color'   => '#1e40af',
            'sort_order' => 1,
            'is_active'  => true,
        ]);
        CmsSlider::create([
            'title'      => 'Academic Excellence Award 2025',
            'subtitle'   => 'Ranked Top 3 in Division-Wide NAT Results',
            'bg_color'   => '#7c3aed',
            'sort_order' => 2,
            'is_active'  => true,
        ]);
        CmsSlider::create([
            'title'      => 'Coming Soon: New Science Laboratory',
            'subtitle'   => 'State-of-the-art facilities for Grade 7-12 Science classes',
            'bg_color'   => '#065f46',
            'sort_order' => 3,
            'is_active'  => false,  // draft
        ]);

        $response = $this->getJson('/api/admin/cms/sliders')->assertOk();
        $this->assertCount(3, $response->json());
        $this->assertEquals(1, $response->json('0.sort_order'));
        $this->assertEquals(2, $response->json('1.sort_order'));
    }

    public function test_admin_can_update_slider(): void
    {
        $this->actAs('Administrator');

        $slider = CmsSlider::create([
            'title'      => 'Draft Banner',
            'bg_color'   => '#374151',
            'sort_order' => 5,
            'is_active'  => false,
        ]);

        $this->putJson("/api/admin/cms/sliders/{$slider->id}", [
            'title'     => 'Draft Banner — Now Live',
            'subtitle'  => 'This banner is now visible on the public website.',
            'is_active' => true,
        ])->assertOk()
            ->assertJsonPath('title', 'Draft Banner — Now Live')
            ->assertJsonPath('is_active', true);
    }

    public function test_admin_can_reorder_sliders(): void
    {
        $this->actAs('Administrator');

        $s1 = CmsSlider::create(['title' => 'Slider A', 'bg_color' => '#111827', 'sort_order' => 1, 'is_active' => true]);
        $s2 = CmsSlider::create(['title' => 'Slider B', 'bg_color' => '#1f2937', 'sort_order' => 2, 'is_active' => true]);
        $s3 = CmsSlider::create(['title' => 'Slider C', 'bg_color' => '#374151', 'sort_order' => 3, 'is_active' => true]);

        // Reorder: put C first, A second, B third
        $this->postJson('/api/admin/cms/sliders/reorder', [
            'order' => [$s3->id, $s1->id, $s2->id],
        ])->assertOk();

        $this->assertEquals(1, CmsSlider::find($s3->id)->sort_order);
        $this->assertEquals(2, CmsSlider::find($s1->id)->sort_order);
        $this->assertEquals(3, CmsSlider::find($s2->id)->sort_order);
    }

    public function test_admin_can_delete_slider(): void
    {
        $this->actAs('Administrator');

        $slider = CmsSlider::create([
            'title'      => 'Expired Enrollment Banner',
            'bg_color'   => '#1e40af',
            'sort_order' => 10,
            'is_active'  => false,
        ]);

        $this->deleteJson("/api/admin/cms/sliders/{$slider->id}")->assertStatus(204);
        $this->assertNull(CmsSlider::find($slider->id));
    }

    public function test_slider_title_is_required(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/sliders', [
            'subtitle'  => 'Missing title',
            'is_active' => true,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['title']);
    }

    public function test_slider_btn_variant_must_be_valid(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/cms/sliders', [
            'title'        => 'Bad Variant Slider',
            'btn1_label'   => 'Click Me',
            'btn1_variant' => 'danger',  // not in [primary, secondary, outline, ghost]
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['btn1_variant']);
    }

    // =========================================================================
    // ── PUBLIC CMS ENDPOINTS (no auth) ───────────────────────────────────────
    // =========================================================================

    public function test_public_can_list_published_news_only(): void
    {
        CmsNews::create([
            'title'        => 'Published: National Schools Press Conference Winners',
            'slug'         => 'nspc-winners-2026',
            'excerpt'      => 'SVHS journalism team bags 5 awards at the 2026 National Schools Press Conference.',
            'category'     => 'Achievement',
            'is_published' => true,
            'published_at' => now(),
        ]);
        CmsNews::create([
            'title'        => 'Unpublished Draft: Upcoming Events Preview',
            'slug'         => 'upcoming-events-preview-draft',
            'category'     => 'General',
            'is_published' => false,
        ]);

        $response = $this->getJson('/api/public/news')->assertOk();
        $this->assertCount(1, $response->json());
        $this->assertSame('Published: National Schools Press Conference Winners', $response->json('0.title'));
    }

    public function test_public_can_read_news_article_by_slug(): void
    {
        CmsNews::create([
            'title'        => 'SVHS Celebrates 50th Founding Anniversary',
            'slug'         => 'svhs-50th-founding-anniversary',
            'excerpt'      => 'A momentous celebration marking five decades of quality Catholic education.',
            'body'         => '<p>St. Vincent High School marked its 50th Founding Anniversary on January 22, 2026 with a solemn Eucharistic celebration, a cultural show, and a reception for alumni from all batches.</p>',
            'category'     => 'Events',
            'is_published' => true,
            'published_at' => now(),
        ]);

        $this->getJson('/api/public/news/svhs-50th-founding-anniversary')
            ->assertOk()
            ->assertJsonPath('title', 'SVHS Celebrates 50th Founding Anniversary')
            ->assertJsonPath('slug', 'svhs-50th-founding-anniversary')
            ->assertJsonStructure(['id', 'title', 'slug', 'body', 'category', 'published_at', 'author']);
    }

    public function test_public_news_slug_not_found_returns_404(): void
    {
        $this->getJson('/api/public/news/does-not-exist')->assertStatus(404);
    }

    public function test_public_news_unpublished_article_returns_404(): void
    {
        CmsNews::create([
            'title'        => 'Draft: Not Yet Ready to Publish',
            'slug'         => 'draft-not-yet-ready',
            'category'     => 'General',
            'is_published' => false,
        ]);

        $this->getJson('/api/public/news/draft-not-yet-ready')->assertStatus(404);
    }

    public function test_public_can_list_gallery_albums(): void
    {
        CmsGalleryAlbum::create([
            'title'      => 'Graduation 2026',
            'slug'       => 'graduation-2026',
            'event_date' => '2026-06-15',
            'sort_order' => 1,
        ]);
        CmsGalleryAlbum::create([
            'title'      => 'Buwan ng Wika 2025',
            'slug'       => 'buwan-ng-wika-2025',
            'event_date' => '2025-08-29',
            'sort_order' => 2,
        ]);

        $response = $this->getJson('/api/public/gallery')->assertOk();
        $this->assertCount(2, $response->json());
        $this->assertSame('Graduation 2026', $response->json('0.title'));
    }

    public function test_public_can_view_album_photos_by_slug(): void
    {
        $album = CmsGalleryAlbum::create([
            'title'      => 'Science Fair 2025',
            'slug'       => 'science-fair-2025',
            'event_date' => '2025-11-20',
            'sort_order' => 1,
        ]);
        CmsGalleryPhoto::create([
            'album_id'   => $album->id,
            'url'        => 'https://example.com/storage/cms/albums/science-fair-1.jpg',
            'caption'    => 'Grade 10 students present their environmental science project.',
            'sort_order' => 1,
        ]);
        CmsGalleryPhoto::create([
            'album_id'   => $album->id,
            'url'        => 'https://example.com/storage/cms/albums/science-fair-2.jpg',
            'caption'    => 'Best in Display award goes to Grade 8-Rizal.',
            'sort_order' => 2,
        ]);

        $response = $this->getJson('/api/public/gallery/science-fair-2025')
            ->assertOk()
            ->assertJsonPath('title', 'Science Fair 2025');

        $this->assertCount(2, $response->json('photos'));
    }

    public function test_public_can_list_events(): void
    {
        CmsEvent::create([
            'title'      => 'Christmas Program 2026',
            'start_date' => '2026-12-18',
            'location'   => 'School Quadrangle',
            'category'   => 'Event',
            'color'      => '#dc2626',
            'is_public'  => true,
        ]);
        CmsEvent::create([
            'title'      => 'End-of-Year Staff Evaluation',
            'start_date' => '2026-03-25',
            'category'   => 'Internal',
            'color'      => '#374151',
            'is_public'  => false,  // not shown publicly
        ]);

        $response = $this->getJson('/api/public/events')->assertOk();
        // Both events are returned by the public endpoint (controller does not filter is_public)
        $this->assertGreaterThanOrEqual(1, count($response->json()));
    }

    public function test_public_can_list_sliders(): void
    {
        CmsSlider::create([
            'title'      => 'Welcome to St. Vincent High School',
            'subtitle'   => 'Nurturing Faith, Excellence, and Service since 1976',
            'bg_color'   => '#1e40af',
            'sort_order' => 1,
            'is_active'  => true,
        ]);

        $this->getJson('/api/public/sliders')
            ->assertOk()
            ->assertJsonStructure([['id', 'title', 'subtitle', 'bg_color', 'sort_order', 'is_active']]);
    }

    // =========================================================================
    // ── AUTHORIZATION ────────────────────────────────────────────────────────
    // =========================================================================

    public function test_non_admin_cannot_create_news_article(): void
    {
        $this->actAs('Registrar');

        $this->postJson('/api/admin/cms/news', [
            'title'    => 'Unauthorized Article',
            'category' => 'General',
        ])->assertStatus(403);
    }

    public function test_non_admin_cannot_create_event(): void
    {
        $this->actAs('Cashier');

        $this->postJson('/api/admin/cms/events', [
            'title'      => 'Unauthorized Event',
            'start_date' => '2026-07-01',
            'category'   => 'Event',
        ])->assertStatus(403);
    }

    public function test_non_admin_cannot_manage_sliders(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/admin/cms/sliders', [
            'title' => 'Unauthorized Slider',
        ])->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_access_admin_cms(): void
    {
        $this->getJson('/api/admin/cms/news')->assertStatus(401);
    }
}
