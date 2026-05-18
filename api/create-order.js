const Razorpay = require('razorpay');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, currency = 'INR', receipt = 'receipt_1' } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (INR 1.00)' });
  }

  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount,
      currency,
      receipt,
    };

    const order = await razorpay.orders.create(options);
    
    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Razorpay Create Order Error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message || error });
  }
};
