@php $reportTitle = 'Recommendations Log'; $filters = []; @endphp
@include('dss.reports._header')

<div class="summary-box">
  <h3>Summary</h3>
  <div class="summary-grid">
    <div class="summary-item">
      <strong>{{ $data->count() }}</strong>
      <span>Total</span>
    </div>
    <div class="summary-item">
      <strong>{{ $data->where('is_actioned', false)->count() }}</strong>
      <span>Pending</span>
    </div>
    <div class="summary-item">
      <strong>{{ $data->where('is_actioned', true)->count() }}</strong>
      <span>Actioned</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Priority</th>
      <th>Category</th>
      <th>Recommendation</th>
      <th>Basis</th>
      <th>Generated</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $r)
    <tr>
      <td>
        <span class="badge {{ match($r->priority) { 'high' => 'badge-red', 'medium' => 'badge-yellow', default => 'badge-blue' } }}">
          {{ ucfirst($r->priority) }}
        </span>
      </td>
      <td>{{ ucfirst($r->category) }}</td>
      <td>{{ $r->recommendation_text }}</td>
      <td>{{ $r->basis }}</td>
      <td>{{ $r->generated_at?->format('Y-m-d') }}</td>
      <td>
        <span class="badge {{ $r->is_actioned ? 'badge-green' : 'badge-gray' }}">
          {{ $r->is_actioned ? 'Actioned' : 'Pending' }}
        </span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>

@include('dss.reports._footer')
