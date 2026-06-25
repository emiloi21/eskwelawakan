<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentDue extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $description,
        public readonly float  $balance,
        public readonly string $schoolYear,
        public readonly string $url = '/student/ledger',
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $formatted = number_format($this->balance, 2);

        return [
            'type'        => 'payment_due',
            'title'       => 'Outstanding Balance',
            'body'        => "You have an outstanding balance of ₱{$formatted} for {$this->description} (S.Y. {$this->schoolYear}).",
            'balance'     => $this->balance,
            'description' => $this->description,
            'school_year' => $this->schoolYear,
            'url'         => $this->url,
        ];
    }
}
