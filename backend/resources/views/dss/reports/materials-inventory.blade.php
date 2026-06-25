@php $reportTitle = 'Materials Inventory Report'; $filters = []; @endphp
@include('dss.reports._header')

<div class="summary-box">
  <h3>Summary</h3>
  <div class="summary-grid">
    <div class="summary-item">
      <strong>{{ count($data) }}</strong>
      <span>Total Items</span>
    </div>
    <div class="summary-item">
      <strong>{{ count(array_filter($data, fn($i) => $i['status'] === 'shortage')) }}</strong>
      <span>Below Reorder Level</span>
    </div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Item</th>
      <th>Category</th>
      <th>Unit</th>
      <th>On Hand</th>
      <th>Reorder Point</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data as $row)
    <tr>
      <td>{{ $row['item_name'] }}</td>
      <td>{{ $row['category'] }}</td>
      <td>{{ $row['unit'] }}</td>
      <td>{{ $row['quantity_on_hand'] }}</td>
      <td>{{ $row['reorder_point'] }}</td>
      <td>
        <span class="badge {{ $row['status'] === 'shortage' ? 'badge-red' : 'badge-green' }}">
          {{ ucfirst($row['status']) }}
        </span>
      </td>
    </tr>
    @endforeach
  </tbody>
</table>

@include('dss.reports._footer')
