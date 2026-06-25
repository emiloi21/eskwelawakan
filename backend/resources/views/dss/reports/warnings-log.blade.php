@php $reportTitle = 'Early Warnings Log'; $filters = []; @endphp
@include('dss.reports._header')

<div class="summary-box">
  <h3>Summary</h3>
  <div class="summary-grid">
    <div class="summary-item">
      <strong>{{ $data->count() }}</strong>
      <span>Total Warnings</span>
    </div>
    <div class="summary-item">
      <strong>{{ $data->where('severity', 'critical')->count() }}</strong>
      <span>Critical</span>
    </div>
    <div class="summary-item">
      <strong>{{ $data->where('is_acknowledged', false)->count() }}</strong>
      <span>Unacknowledged</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Severity</th>
      <th>Message</th>
      <th>Triggered</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $w)
    <tr>
      <td>{{ str_replace('_', ' ', $w->warning_type) }}</td>
      <td>
        <span class="badge {{ match($w->severity) { 'critical' => 'badge-red', 'warning' => 'badge-yellow', default => 'badge-blue' } }}">
          {{ ucfirst($w->severity) }}
        </span>
      </td>
      <td>{{ $w->message }}</td>
      <td>{{ $w->triggered_at?->format('Y-m-d H:i') }}</td>
      <td>
        <span class="badge {{ $w->is_acknowledged ? 'badge-green' : 'badge-gray' }}">
          {{ $w->is_acknowledged ? 'Acknowledged' : 'Open' }}
        </span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>

@include('dss.reports._footer')
