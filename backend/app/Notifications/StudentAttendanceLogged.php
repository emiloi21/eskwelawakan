<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class StudentAttendanceLogged extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $studentName,
        public readonly string $direction,   // 'in' | 'out'
        public readonly string $logTime,     // formatted e.g. "7:42 AM"
        public readonly string $date,        // e.g. "March 30, 2026"
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $verb   = $this->direction === 'in' ? 'arrived at school' : 'left school';
        $emoji  = $this->direction === 'in' ? '✅' : '🏠';

        return [
            'type'         => 'student_attendance',
            'title'        => "{$emoji} Student Attendance",
            'body'         => "{$this->studentName} {$verb} on {$this->date} at {$this->logTime}.",
            'student_name' => $this->studentName,
            'direction'    => $this->direction,
            'log_time'     => $this->logTime,
            'date'         => $this->date,
            'url'          => '/parent',
        ];
    }
}
