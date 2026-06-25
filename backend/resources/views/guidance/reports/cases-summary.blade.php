@php $title = 'Cases Summary Report'; @endphp
@include('guidance.reports._header')

<table>
  <thead>
    <tr>
      <th>Case #</th>
      <th>Student</th>
      <th>Type</th>
      <th>Urgency</th>
      <th>Status</th>
      <th>Counselor</th>
      <th>Opened</th>
      <th>Closed</th>
    </tr>
  </thead>
  <tbody>
    @forelse($cases as $case)
    <tr>
      <td>{{ $case->case_number }}</td>
      <td>{{ $case->student ? $case->student->last_name.', '.$case->student->first_name : '—' }}</td>
      <td>{{ ucwords(str_replace('_',' ',$case->case_type)) }}</td>
      <td>
        @if($case->urgency === 'crisis')
          <span class="badge badge-red">Crisis</span>
        @elseif($case->urgency === 'urgent')
          <span class="badge badge-yellow">Urgent</span>
        @else
          <span class="badge badge-gray">Routine</span>
        @endif
      </td>
      <td>
        @if(in_array($case->status, ['open','ongoing']))
          <span class="badge badge-blue">{{ ucfirst($case->status) }}</span>
        @elseif($case->status === 'resolved')
          <span class="badge badge-green">Resolved</span>
        @else
          <span class="badge badge-gray">{{ ucwords(str_replace('_',' ',$case->status)) }}</span>
        @endif
      </td>
      <td>{{ $case->assignedCounselor ? $case->assignedCounselor->name : '—' }}</td>
      <td>{{ $case->opened_at ? \Carbon\Carbon::parse($case->opened_at)->format('M d, Y') : '—' }}</td>
      <td>{{ $case->closed_at ? \Carbon\Carbon::parse($case->closed_at)->format('M d, Y') : '—' }}</td>
    </tr>
    @empty
    <tr><td colspan="8" style="text-align:center;color:#9ca3af;">No cases found.</td></tr>
    @endforelse
  </tbody>
</table>

@include('guidance.reports._footer')
