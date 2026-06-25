<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EnrollmentStatusUpdatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $studentName,
        public readonly string $newStatus,
        public readonly string $schoolYear,
        public readonly ?string $remarks = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Enrollment Status Update — ' . $this->newStatus);
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.enrollment-status-updated');
    }
}
