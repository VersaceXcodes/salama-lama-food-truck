import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

const UV_TrackOrder: React.FC = () => {
  const navigate = useNavigate();
  const [ticketNumber, setTicketNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Trim and uppercase the ticket number
    const normalizedTicket = ticketNumber.trim().toUpperCase();

    if (!normalizedTicket) {
      setError('Please enter your ticket number');
      return;
    }

    setIsLoading(true);

    try {
      // Verify the ticket exists before navigating
      const response = await axios.get('/api/orders/track', {
        params: {
          ticket: normalizedTicket,
        },
      });

      // If successful, navigate to the tracking page
      if (response.data.data) {
        navigate(`/track/${normalizedTicket}`);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Ticket not found. Please check your ticket number and try again.");
      } else if (err.response?.status === 400) {
        setError('Please enter a valid ticket number');
      } else {
        setError('Something went wrong. Please try again later.');
      }
      console.error('Track order error:', err);
      setIsLoading(false);
    }
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
      </div>
    </div>
  );
};

export default UV_TrackOrder;
