@component('mail::message')
# Enrollment Status Update

Hi **{{ $studentName }}**,

Your enrollment status for School Year **{{ $schoolYear }}** has been updated.

@component('mail::panel')
**New Status: {{ $newStatus }}**
@if ($remarks)

*Remarks: {{ $remarks }}*
@endif
@endcomponent

@if ($newStatus === 'Enrolled')
**Congratulations!** You are now officially enrolled. Please log in to your student portal to view your billing statement and class schedule.
@elseif ($newStatus === 'For Payment')
Your enrollment has been assessed. Please proceed to the accounting office or use the student portal to settle your fees.
@elseif ($newStatus === 'For Accounts Assessment')
Your documents have been verified. Please wait while your fees are being prepared — you will be notified once done.
@elseif ($newStatus === 'For Application Assessment')
Your application is now under review by our registrar. You will be notified of any updates.
@elseif (in_array($newStatus, ['Withdrawn', 'Dropped', 'Transferred Out']))
If you believe this is an error or have questions, please contact the registrar's office.
@else
Please log in to your portal to view further details.
@endif

@component('mail::button', ['url' => config('app.frontend_url', 'http://localhost:5173') . '/login'])
View My Portal
@endcomponent

{{ config('mail.from.name') }}
@endcomponent
