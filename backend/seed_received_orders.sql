-- Script to add test orders in 'received' status for browser testing
-- This creates sample orders that can be used to test the order queue workflow

-- Insert test orders in 'received' status
INSERT INTO orders (
    order_id, order_number, user_id, order_type, status,
    collection_time_slot, delivery_address_id, delivery_address_snapshot,
    delivery_fee, estimated_delivery_time, subtotal, discount_code, discount_amount,
    tax_amount, total_amount, payment_status, payment_method_id, payment_method_type,
    sumup_transaction_id, invoice_url, loyalty_points_awarded, special_instructions,
    customer_name, customer_email, customer_phone, created_at, updated_at,
    completed_at, cancelled_at, cancellation_reason, refund_amount, refund_reason,
    refunded_at, internal_notes
) VALUES 
-- Order 1: Collection order in 'received' status
(
    'ord_test_001', 'ORD-2025-TEST-001', 'user_003', 'collection', 'received',
    '2025-12-13T14:00:00Z', NULL, NULL,
    NULL, NULL, 15.50, NULL, 0.00,
    3.57, 19.07, 'paid', 'pm_001', 'card',
    'sumup_tx_test_001', NULL, 19, 'Extra hot please',
    'John Smith', 'john.smith@email.ie', '+353871234569',
    '2025-12-13T12:00:00Z', '2025-12-13T12:00:00Z',
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL
),
-- Order 2: Delivery order in 'received' status
(
    'ord_test_002', 'ORD-2025-TEST-002', 'user_004', 'delivery', 'received',
    NULL, 'addr_003', '{"label": "Home", "address_line1": "8 Ranelagh Road", "city": "Dublin", "postal_code": "D06 W2P4"}',
    3.50, '2025-12-13T13:30:00Z', 22.00, NULL, 0.00,
    5.87, 31.37, 'paid', 'pm_002', 'card',
    'sumup_tx_test_002', NULL, 31, 'Please ring doorbell',
    'Sarah Wilson', 'sarah.wilson@email.ie', '+353871234570',
    '2025-12-13T12:15:00Z', '2025-12-13T12:15:00Z',
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL
),
-- Order 3: Another collection order in 'received' status
(
    'ord_test_003', 'ORD-2025-TEST-003', 'user_005', 'collection', 'received',
    '2025-12-13T15:30:00Z', NULL, NULL,
    NULL, NULL, 12.50, NULL, 0.00,
    2.88, 15.38, 'paid', 'pm_003', 'card',
    'sumup_tx_test_003', NULL, 15, NULL,
    'Michael Byrne', 'michael.byrne@email.ie', '+353871234571',
    '2025-12-13T12:30:00Z', '2025-12-13T12:30:00Z',
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL
);

-- Insert order items for test order 1
INSERT INTO order_items (
    order_item_id, order_id, item_id, item_name, quantity, unit_price,
    selected_customizations, line_total
) VALUES
('oi_test_001', 'ord_test_001', 'item_003', 'Latte', 2, 4.80, '{"Milk Type": "Oat Milk", "Size": "Large"}', 9.60),
('oi_test_002', 'ord_test_001', 'item_010', 'Croissant', 2, 3.50, NULL, 7.00);

-- Insert order items for test order 2
INSERT INTO order_items (
    order_item_id, order_id, item_id, item_name, quantity, unit_price,
    selected_customizations, line_total
) VALUES
('oi_test_003', 'ord_test_002', 'item_013', 'Turkey & Avocado Sandwich', 2, 8.00, '{"Bread Type": "Whole Grain"}', 16.00),
('oi_test_004', 'ord_test_002', 'item_007', 'Iced Latte', 1, 5.30, '{"Milk Type": "Almond Milk", "Size": "Large"}', 5.30);

-- Insert order items for test order 3
INSERT INTO order_items (
    order_item_id, order_id, item_id, item_name, quantity, unit_price,
    selected_customizations, line_total
) VALUES
('oi_test_005', 'ord_test_003', 'item_002', 'Cappuccino', 2, 4.30, '{"Milk Type": "Oat Milk", "Size": "Regular"}', 8.60),
('oi_test_006', 'ord_test_003', 'item_012', 'Blueberry Scone', 1, 3.20, NULL, 3.20);

-- Insert order status history for test orders
INSERT INTO order_status_history (
    history_id, order_id, status, changed_by_user_id, changed_at, notes
) VALUES
('osh_test_001', 'ord_test_001', 'received', 'user_003', '2025-12-13T12:00:00Z', 'Order placed'),
('osh_test_002', 'ord_test_002', 'received', 'user_004', '2025-12-13T12:15:00Z', 'Order placed'),
('osh_test_003', 'ord_test_003', 'received', 'user_005', '2025-12-13T12:30:00Z', 'Order placed');
