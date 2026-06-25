<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApplicationReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $applicantName,
        public readonly string $username,
        public readonly string $gradeLevel,
        public readonly string $schoolYear,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Application Received — Your Login Credentials');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.application-received');
    }
}
