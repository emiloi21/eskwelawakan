@component('mail::message')
# Application Received

Hi **{{ $applicantName }}**,

Your enrollment application for **{{ $gradeLevel }}** (School Year **{{ $schoolYear }}**) has been received and is now under review by our registrar.

Please save your portal login credentials:

| | |
|---|---|
| **Username** | `{{ $username }}` |

@component('mail::button', ['url' => config('app.frontend_url', 'http://localhost:5173') . '/login'])
Track My Application
@endcomponent

Once logged in, you can:

- View your application status in real time
- Upload required documents
- Receive status update notifications

If you did not submit this application, please disregard this email.

{{ config('mail.from.name') }}
@endcomponent
