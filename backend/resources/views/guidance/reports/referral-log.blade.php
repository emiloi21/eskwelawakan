@php $title = 'Referral Log'; @endphp
@include('guidance.reports._header')

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Student</th>
      <th>Type</th>
      <th>Referrer</th>
      <th>Role</th>
      <th>Urgency</th>
      <th>Status</th>
      <th>Concern (Summary)</th>
    </tr>
  </thead>
  <tbody>
    @forelse($referrals as $r)
    <tr>
      <td>{{ \Carbon\Carbon::parse($r->referred_at)->format('M d, Y') }}</td>
      <td>{{ $r->student ? $r->student->last_name.', '.$r->student->first_name : '—' }}</td>
      <td>{{ ucfirst($r->referral_type) }}</td>
      <td>{{ $r->referrer_name }}</td>
      <td>{{ $r->referrer_role ?? '—' }}</td>
      <td>
        @if($r->urgency === 'crisis')
          <span class="badge badge-red">Crisis</span>
        @elseif($r->urgency === 'urgent')
          <span class="badge badge-yellow">Urgent</span>
        @else
          <span class="badge badge-gray">Routine</span>
        @endif
      </td>
      <td>
        @if($r->status === 'converted_to_case')
          <span class="badge badge-green">Case Opened</span>
        @elseif($r->status === 'pending')
          <span class="badge badge-yellow">Pending</span>
        @elseif($r->status === 'acknowledged')
          <span class="badge badge-blue">Acknowledged</span>
        @else
          <span class="badge badge-gray">Declined</span>
        @endif
      </td>
      <td>{{ \Illuminate\Support\Str::limit($r->concern_description, 60) }}</td>
    </tr>
    @empty
    <tr><td colspan="8" style="text-align:center;color:#9ca3af;">No referrals found.</td></tr>
    @endforelse
  </tbody>
</table>

@include('guidance.reports._footer')
