<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example — verify the API is reachable.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->getJson('/api/school-info');

        $response->assertStatus(200);
    }
}
