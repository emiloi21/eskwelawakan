@php $title = 'Group Sessions & Activities Log'; @endphp
@include('guidance.reports._header')

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Title</th>
      <th>Type</th>
      <th>Target Group</th>
      <th>Venue</th>
      <th>Attendees</th>
      <th>Facilitator</th>
    </tr>
  </thead>
  <tbody>
    @forelse($sessions as $s)
    <tr>
      <td>{{ \Carbon\Carbon::parse($s->session_date)->format('M d, Y') }}</td>
      <td>{{ $s->session_title }}</td>
      <td>{{ ucwords(str_replace('_',' ',$s->session_type)) }}</td>
      <td>{{ $s->target_group ?? '—' }}</td>
      <td>{{ $s->venue ?? '—' }}</td>
      <td>{{ $s->attendee_count }}</td>
      <td>{{ $s->facilitator ? $s->facilitator->name : '—' }}</td>
    </tr>
    @empty
    <tr><td colspan="7" style="text-align:center;color:#9ca3af;">No group sessions found.</td></tr>
    @endforelse
  </tbody>
</table>

@include('guidance.reports._footer')
