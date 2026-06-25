<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EnrollmentStatusChanged extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string  $newStatus,
        public readonly string  $schoolYear,
        public readonly ?string $remarks = null,
        public readonly ?string $studentName = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $isParent = $this->studentName !== null;
        $bodyPrefix = $isParent
            ? "Your child {$this->studentName}'s enrollment status is now"
            : 'Your enrollment status is now';

        return [
            'type'         => 'enrollment_status',
            'title'        => 'Enrollment Status Updated',
            'body'         => "{$bodyPrefix} \"{$this->newStatus}\" for S.Y. {$this->schoolYear}.",
            'status'       => $this->newStatus,
            'school_year'  => $this->schoolYear,
            'remarks'      => $this->remarks,
            'student_name' => $this->studentName,
            'url'          => $isParent ? '/parent' : match (true) {
                in_array($this->newStatus, ['Enrolled'])               => '/student/enrollment',
                in_array($this->newStatus, ['For Payment'])             => '/student/enrollment',
                in_array($this->newStatus, ['For Accounts Assessment']) => '/applicant',
                in_array($this->newStatus, ['For Application Assessment', 'Pending']) => '/applicant',
                default => null,
            },
        ];
    }
}
