@php $title = 'Anecdotal Records Log'; @endphp
@include('guidance.reports._header')

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Student</th>
      <th>Observed By</th>
      <th>Role</th>
      <th>Location</th>
      <th>Description (Summary)</th>
      <th>Filed By</th>
    </tr>
  </thead>
  <tbody>
    @forelse($records as $r)
    <tr>
      <td>{{ \Carbon\Carbon::parse($r->observation_date)->format('M d, Y') }}</td>
      <td>{{ $r->student ? $r->student->last_name.', '.$r->student->first_name : '—' }}</td>
      <td>{{ $r->observed_by_name }}</td>
      <td>{{ $r->observed_by_role }}</td>
      <td>{{ $r->location ?? '—' }}</td>
      <td>{{ \Illuminate\Support\Str::limit($r->behavior_description, 80) }}</td>
      <td>{{ $r->filedBy ? $r->filedBy->name : '—' }}</td>
    </tr>
    @empty
    <tr><td colspan="7" style="text-align:center;color:#9ca3af;">No records found.</td></tr>
    @endforelse
  </tbody>
</table>

@include('guidance.reports._footer')
