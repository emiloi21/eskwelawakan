<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class GradePosted extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $subject,
        public readonly string $gradeLevel,
        public readonly string $schoolYear,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'        => 'grade_posted',
            'title'       => 'Grades Posted',
            'body'        => "Your grades for {$this->subject} ({$this->gradeLevel}, S.Y. {$this->schoolYear}) have been updated.",
            'subject'     => $this->subject,
            'grade_level' => $this->gradeLevel,
            'school_year' => $this->schoolYear,
            'url'         => '/student/grades',
        ];
    }
}
