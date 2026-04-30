'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { toast } from '@/lib/toast';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

interface Shipment {
  id: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  status: string;
}

interface Expense {
  id: string;
  type: string;
  amount: number;
  date: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  fileUrl: string;
}

interface TrackingEvent {
  id: string;
  status: string;
  location: string | null;
  description: string | null;
  eventDate: string;
}

interface Container {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  shippingLine: string | null;
  bookingNumber: string | null;
  loadingPort: string | null;
  destinationPort: string | null;
  transshipmentPorts: string[];
  loadingDate: string | null;
  departureDate: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  status: string;
  currentLocation: string | null;
  progress: number;
  maxCapacity: number;
  currentCount: number;
  notes: string | null;
  createdAt: string;
  shipments: Shipment[];
  expenses: Expense[];
  invoices: Invoice[];
  documents: Document[];
  trackingEvents: TrackingEvent[];
  totals: {
    expenses: number;
    invoices: number;
  };
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-500',
  WAITING_FOR_LOADING: 'bg-yellow-500',
  LOADED: 'bg-blue-500',
  IN_TRANSIT: 'bg-indigo-600',
  ARRIVED_PORT: 'bg-green-500',
  CUSTOMS_CLEARANCE: 'bg-orange-500',
  RELEASED: 'bg-teal-500',
  CLOSED: 'bg-gray-700',
};

const statusLabels: Record<string, string> = {
  CREATED: 'Created',
  WAITING_FOR_LOADING: 'Waiting for Loading',
  LOADED: 'Loaded',
  IN_TRANSIT: 'In Transit',
  ARRIVED_PORT: 'Arrived',
  CUSTOMS_CLEARANCE: 'Customs',
  RELEASED: 'Released',
  CLOSED: 'Closed',
};

export default function ContainerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [container, setContainer] = useState<Container | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchContainer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchContainer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/containers/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setContainer(data.container);
      } else {
        toast.error('Container not found', 'Redirecting to containers list...');
        router.push('/dashboard/containers');
      }
    } catch (error) {
      console.error('Error fetching container:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Update container status to ${statusLabels[newStatus]}?`)) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/containers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success('Status updated successfully', 'Container status has been updated');
        fetchContainer();
      } else {
        const data = await response.json();
        toast.error('Failed to update status', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status', 'An error occurred. Please try again');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading container...</p>
        </div>
      </div>
    );
  }

  if (!container) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="text-center p-8">
          <p className="text-gray-600 dark:text-gray-400">Container not found</p>
          <Button className="mt-4" onClick={() => router.push('/dashboard/containers')}>
            Back to Containers
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <Breadcrumbs 
            items={[
              { label: 'Containers', href: '/dashboard/containers' },
              { label: container.containerNumber },
            ]}
            className="mb-4"
          />
          
          {/* Header */}
          <div className="mb-6">
            <Button onClick={() => router.push('/dashboard/containers')} className="mb-4">
              ← Back to Containers
            </Button>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {container.containerNumber}
                </h1>
                {container.trackingNumber && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Tracking: {container.trackingNumber}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Badge className={statusColors[container.status]}>
                  {statusLabels[container.status]}
                </Badge>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Shipping Progress
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {container.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${container.progress}%` }}
              />
            </div>
          </Card>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-4">
              {['overview', 'shipments', 'expenses', 'invoices', 'documents', 'tracking', 'timeline'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 border-b-2 font-medium capitalize ${
                    activeTab === tab
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                  {tab === 'shipments' && ` (${container.shipments.length})`}
                  {tab === 'expenses' && ` (${container.expenses.length})`}
                  {tab === 'invoices' && ` (${container.invoices.length})`}
                  {tab === 'documents' && ` (${container.documents.length})`}
                  {tab === 'tracking' && ` (${container.trackingEvents.length})`}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <h3 className="text-lg font-bold mb-4">Container Information</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Container #:</span>
                      <span className="font-medium">{container.containerNumber}</span>
                    </div>
                    {container.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tracking #:</span>
                        <span className="font-medium">{container.trackingNumber}</span>
                      </div>
                    )}
                    {container.bookingNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Booking #:</span>
                        <span className="font-medium">{container.bookingNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Capacity:</span>
                      <span className="font-medium">
                        {container.currentCount} / {container.maxCapacity} vehicles
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span className="font-medium">
                        {new Date(container.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-bold mb-4">Shipping Details</h3>
                  <div className="space-y-3 text-sm">
                    {container.vesselName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Vessel:</span>
                        <span className="font-medium">{container.vesselName}</span>
                      </div>
                    )}
                    {container.voyageNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Voyage:</span>
                        <span className="font-medium">{container.voyageNumber}</span>
                      </div>
                    )}
                    {container.shippingLine && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Shipping Line:</span>
                        <span className="font-medium">{container.shippingLine}</span>
                      </div>
                    )}
                    {container.loadingPort && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Loading Port:</span>
                        <span className="font-medium">{container.loadingPort}</span>
                      </div>
                    )}
                    {container.destinationPort && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Destination:</span>
                        <span className="font-medium">{container.destinationPort}</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-bold mb-4">Important Dates</h3>
                  <div className="space-y-3 text-sm">
                    {container.loadingDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Loading Date:</span>
                        <span className="font-medium">
                          {new Date(container.loadingDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {container.departureDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Departure:</span>
                        <span className="font-medium">
                          {new Date(container.departureDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {container.estimatedArrival && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">ETA:</span>
                        <span className="font-medium">
                          {new Date(container.estimatedArrival).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {container.actualArrival && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Actual Arrival:</span>
                        <span className="font-medium">
                          {new Date(container.actualArrival).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <h3 className="text-lg font-bold mb-4">Financial Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Expenses:</span>
                      <span className="font-bold text-red-600">
                        ${container.totals.expenses.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Invoices:</span>
                      <span className="font-bold text-blue-600">
                        ${container.totals.invoices.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Net:</span>
                        <span className={container.totals.invoices - container.totals.expenses >= 0 ? 'text-green-600' : 'text-red-600'}>
                          ${(container.totals.invoices - container.totals.expenses).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {container.notes && (
                  <Card className="md:col-span-2">
                    <h3 className="text-lg font-bold mb-4">Notes</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {container.notes}
                    </p>
                  </Card>
                )}

                {/* Status Update Actions */}
                <Card className="md:col-span-2">
                  <h3 className="text-lg font-bold mb-4">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <Button
                        key={status}
                        onClick={() => handleStatusUpdate(status)}
                        disabled={updating || container.status === status}
                        className={container.status === status ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Shipments Tab */}
            {activeTab === 'shipments' && (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Assigned Vehicles ({container.shipments.length}/{container.maxCapacity})</h3>
                  <Button onClick={() => router.push(`/dashboard/containers/${container.id}/assign-shipments`)}>
                    + Assign Vehicles
                  </Button>
                </div>
                {container.shipments.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No vehicles assigned yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {container.shipments.map((shipment) => (
                      <div
                        key={shipment.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => router.push(`/dashboard/shipments/${shipment.id}`)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium">
                              {shipment.vehicleMake} {shipment.vehicleModel}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              VIN: {shipment.vehicleVIN || 'N/A'}
                            </p>
                          </div>
                          <Badge className={shipment.status === 'IN_TRANSIT' ? 'bg-blue-500' : 'bg-gray-500'}>
                            {shipment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Other tabs - simplified for now */}
            {activeTab === 'expenses' && (
              <Card>
                <h3 className="text-lg font-bold mb-4">Expenses</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {container.expenses.length} expense(s) recorded
                </p>
                {/* Add expense list here */}
              </Card>
            )}

            {activeTab === 'invoices' && (
              <Card>
                <h3 className="text-lg font-bold mb-4">Invoices</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {container.invoices.length} invoice(s) recorded
                </p>
                {/* Add invoice list here */}
              </Card>
            )}

            {activeTab === 'documents' && (
              <Card>
                <h3 className="text-lg font-bold mb-4">Documents</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {container.documents.length} document(s) uploaded
                </p>
                {/* Add document list here */}
              </Card>
            )}

            {activeTab === 'tracking' && (
              <Card>
                <h3 className="text-lg font-bold mb-4">Tracking Events</h3>
                {container.trackingEvents.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">No tracking events yet</p>
                ) : (
                  <div className="space-y-4">
                    {container.trackingEvents.map((event) => (
                      <div key={event.id} className="border-l-4 border-indigo-600 pl-4">
                        <div className="flex justify-between">
                          <p className="font-medium">{event.status}</p>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(event.eventDate).toLocaleString()}
                          </span>
                        </div>
                        {event.location && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            📍 {event.location}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'timeline' && (
              <Card>
                <h3 className="text-lg font-bold mb-4">Container Timeline</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Visual timeline will be displayed here
                </p>
                {/* Add timeline visualization */}
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminRoute>
  );
}
