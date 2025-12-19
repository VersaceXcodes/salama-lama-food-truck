import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Package, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface OrderItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  selected_customizations: any;
}

interface OrderTrackingData {
  ticket_number: string;
  order_number: string;
  status: string;
  order_type: 'collection' | 'delivery';
  collection_time_slot?: string;
  estimated_delivery_time?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  delivery_fee: number;
  total_amount: number;
  status_history: Array<{
    status: string;
    changed_at: string;
    notes?: string;
  }>;
}

const UV_TrackOrder: React.FC = () => {
  const [ticketNumber, setTicketNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderTrackingData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrderData(null);

    // Trim and uppercase the ticket number
    const normalizedTicket = ticketNumber.trim().toUpperCase();

    if (!normalizedTicket) {
      setError('Please enter your ticket number');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.get('/api/orders/track', {
        params: {
          ticket: normalizedTicket,
        },
      });

      setOrderData(response.data.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Ticket not found. Please check your ticket number and try again.");
      } else if (err.response?.status === 400) {
        setError('Please enter a valid ticket number');
      } else {
        setError('Something went wrong. Please try again later.');
      }
      console.error('Track order error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="h-4 w-4" /> },
      accepted: { label: 'Accepted', variant: 'default', icon: <CheckCircle2 className="h-4 w-4" /> },
      preparing: { label: 'Preparing', variant: 'default', icon: <Package className="h-4 w-4" /> },
      ready: { label: 'Ready', variant: 'default', icon: <CheckCircle2 className="h-4 w-4" /> },
      completed: { label: 'Completed', variant: 'outline', icon: <CheckCircle2 className="h-4 w-4" /> },
      cancelled: { label: 'Cancelled', variant: 'destructive', icon: <XCircle className="h-4 w-4" /> },
    };

    const config = statusConfig[status.toLowerCase()] || { label: status, variant: 'outline' as const, icon: <AlertCircle className="h-4 w-4" /> };

    return (
      <Badge variant={config.variant} className="flex items-center gap-2 px-4 py-2 text-base">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-[#F2EFE9] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#6F4E37] mb-2">Track Your Order</h1>
          <p className="text-gray-600">Enter your order details to see the current status</p>
        </div>

        {/* Track Order Form */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-[#6F4E37]">Order Tracking</CardTitle>
            <CardDescription>
              Enter the ticket number from your order confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticketNumber" className="text-base font-semibold">
                  Ticket Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ticketNumber"
                  type="text"
                  placeholder="e.g., SL-109229"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  disabled={isLoading}
                  className="text-base h-12"
                  required
                />
                <p className="text-sm text-gray-600">
                  You can find your ticket number on your order confirmation page.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold"
                style={{ backgroundColor: '#6F4E37', color: 'white' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Tracking...
                  </>
                ) : (
                  'Track Order'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Details */}
        {orderData && (
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl text-[#6F4E37]">Order Status</CardTitle>
                    <CardDescription className="mt-1">
                      Ticket: <span className="font-semibold">{orderData.ticket_number}</span>
                      {orderData.order_number && (
                        <> | Order: <span className="font-semibold">{orderData.order_number}</span></>
                      )}
                    </CardDescription>
                  </div>
                  {getStatusBadge(orderData.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Order Type</p>
                    <p className="text-base font-semibold capitalize">{orderData.order_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Created</p>
                    <p className="text-base font-semibold">{formatDate(orderData.created_at)}</p>
                  </div>
                  {orderData.collection_time_slot && (
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Collection Time</p>
                      <p className="text-base font-semibold">{orderData.collection_time_slot}</p>
                    </div>
                  )}
                  {orderData.estimated_delivery_time && (
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Estimated Delivery</p>
                      <p className="text-base font-semibold">{formatDate(orderData.estimated_delivery_time)}</p>
                    </div>
                  )}
                  {orderData.completed_at && (
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Completed</p>
                      <p className="text-base font-semibold">{formatDate(orderData.completed_at)}</p>
                    </div>
                  )}
                </div>

                {/* Status History */}
                {orderData.status_history.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Order Timeline</h3>
                      <div className="space-y-2">
                        {orderData.status_history.map((history, index) => (
                          <div key={index} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-[#6F4E37] mt-1.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold capitalize">{history.status}</span>
                                <span className="text-gray-500">• {formatDate(history.changed_at)}</span>
                              </div>
                              {history.notes && (
                                <p className="text-gray-600 mt-0.5">{history.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Order Items Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-[#6F4E37]">Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderData.items.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-base">{item.item_name}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          {item.selected_customizations && (
                            <p className="text-sm text-gray-500 mt-1">
                              {typeof item.selected_customizations === 'string'
                                ? item.selected_customizations
                                : JSON.stringify(item.selected_customizations)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(item.line_total)}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(item.unit_price)} each</p>
                        </div>
                      </div>
                      {index < orderData.items.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Order Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(orderData.subtotal)}</span>
                  </div>
                  {orderData.discount_amount > 0 && (
                    <div className="flex justify-between text-base text-green-600">
                      <span>Discount</span>
                      <span className="font-semibold">-{formatCurrency(orderData.discount_amount)}</span>
                    </div>
                  )}
                  {orderData.delivery_fee > 0 && (
                    <div className="flex justify-between text-base">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="font-semibold">{formatCurrency(orderData.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-semibold">{formatCurrency(orderData.tax_amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-[#6F4E37]">Total</span>
                    <span className="text-[#6F4E37]">{formatCurrency(orderData.total_amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UV_TrackOrder;
