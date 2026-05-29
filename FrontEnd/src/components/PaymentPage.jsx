import React, { useState, useEffect, useContext } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GlobalStateContext } from '../context/GlobalStateContext'
import './CSS/Payment.css'

const PaymentPage = () => {
    const { isLoggedIn, user, updateQuantity, clearCart } = useContext(GlobalStateContext)
    const navigate = useNavigate()
    const location = useLocation()
    
    const [cartItems, setCartItems] = useState([])
    const [total, setTotal] = useState(0)
    const [paymentMethod, setPaymentMethod] = useState('upi') // 'upi' or 'cod'
    const [copied, setCopied] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')
    const [paymentSuccess, setPaymentSuccess] = useState(false)
    const [countdown, setCountdown] = useState(4)

    const upiId = 'ankitasunitha@oksbi'

    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login', { state: { from: { pathname: '/payment' } } })
            return
        }

        // Load cart details passed via state
        if (location.state && location.state.cartItems && location.state.total) {
            setCartItems(location.state.cartItems)
            setTotal(location.state.total)
        } else {
            // If direct access without state, go back to cart
            navigate('/cart')
        }
    }, [isLoggedIn, location.state, navigate])

    // Generate UPI URI for QR Code
    const upiUri = `upi://pay?pa=${upiId}&pn=EchoEats&am=${total.toFixed(2)}&cu=INR`
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(upiUri)}`

    const handleCopyUpi = async () => {
        try {
            await navigator.clipboard.writeText(upiId)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        } catch (err) {
            console.error('Failed to copy UPI ID:', err)
        }
    }

    const processOrder = async (method) => {
        setLoading(true)
        setLoadingMessage(method === 'upi' ? 'Verifying payment status...' : 'Placing your order...')
        
        try {
            // 1. Create order in Django backend
            const orderPayload = {
                userId: user.user_id,
                amount: total,
                items: cartItems,
                paymentMethod: method === 'upi' ? 'UPI' : 'COD'
            }

            const response = await fetch('/create-order/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            })

            const data = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to initialize order on server')
            }

            // 2. Simulate Payment Verification for UPI
            if (method === 'upi') {
                await new Promise((resolve) => setTimeout(resolve, 2000))
                
                // Call verification endpoint in backend
                const verifyPayload = {
                    razorpay_payment_id: 'PAY_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    razorpay_order_id: data.razorpayOrderId || ('RZP_' + Math.random().toString(36).substr(2, 9)),
                    razorpay_signature: 'SIG_VALIDATED_OFFLINE',
                    orderId: data.orderId
                }

                const verifyRes = await fetch('/verify-payment/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(verifyPayload)
                })

                if (!verifyRes.ok) {
                    throw new Error('UPI Payment verification failed')
                }
            } else {
                // COD takes a brief moment to register
                await new Promise((resolve) => setTimeout(resolve, 1500))
            }

            // 3. Save order to Firebase Firestore as well for secondary backup and real-time syncing
            try {
                const { collection, addDoc } = await import('firebase/firestore')
                const { db } = await import('../firebase')
                await addDoc(collection(db, 'orders'), {
                    orderId: data.orderId,
                    userId: user.user_id,
                    amount: total,
                    items: cartItems,
                    paymentMethod: method === 'upi' ? 'UPI' : 'COD',
                    status: method === 'upi' ? 'completed' : 'placed',
                    createdAt: new Date()
                })
            } catch (fbErr) {
                console.warn('Firebase order sync skipped/failed:', fbErr)
            }

            // 4. Success state trigger
            setLoading(false)
            setPaymentSuccess(true)

            // Clear quantity from all items in state
            await clearCart()

        } catch (error) {
            console.error('Checkout error:', error)
            alert(error.message || 'Payment processing failed. Please try again.')
            setLoading(false)
        }
    }

    // Handle timer redirect
    useEffect(() => {
        if (paymentSuccess) {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        navigate('/orders')
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [paymentSuccess, navigate])

    return (
        <div className="payment-page-container">
            {/* Success Overlay Screen */}
            {paymentSuccess && (
                <div className="payment-success-overlay">
                    <div className="success-card">
                        <div className="success-checkmark-wrapper">
                            <div className="success-checkmark">
                                <span>L</span>
                            </div>
                        </div>
                        <h2 className="animate-pop">Order Placed Successfully!</h2>
                        <p className="success-subtext">Thank you for dining with EchoEats. Your freshly cooked meal is being prepared 🛵</p>
                        <div className="order-details-summary">
                            <p><strong>Order Amount:</strong> ₹{total.toFixed(2)}</p>
                            <p><strong>Method:</strong> {paymentMethod === 'upi' ? 'UPI Transaction' : 'Cash on Delivery'}</p>
                        </div>
                        <div className="redirect-countdown">
                            Taking you to your Orders history in <span>{countdown}</span> seconds...
                        </div>
                    </div>
                </div>
            )}

            {/* Loading/Verifying State */}
            {loading && (
                <div className="payment-loading-overlay">
                    <div className="loader-box">
                        <div className="custom-spinner"></div>
                        <p>{loadingMessage}</p>
                    </div>
                </div>
            )}

            <div className="payment-grid-wrapper">
                <div className="payment-options-panel">
                    <h2>Choose Payment Method</h2>
                    
                    <div className="method-selector-tabs">
                        <button 
                            className={`method-tab ${paymentMethod === 'upi' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('upi')}
                        >
                            <span className="tab-icon">📱</span>
                            <div className="tab-label">
                                <strong>Pay via UPI</strong>
                                <span>Scan QR Code or copy ID</span>
                            </div>
                        </button>
                        
                        <button 
                            className={`method-tab ${paymentMethod === 'cod' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('cod')}
                        >
                            <span className="tab-icon">💵</span>
                            <div className="tab-label">
                                <strong>Cash on Delivery (COD)</strong>
                                <span>Pay at your doorstep</span>
                            </div>
                        </button>
                    </div>

                    <div className="payment-method-details">
                        {paymentMethod === 'upi' ? (
                            <div className="upi-payment-panel">
                                <div className="qr-container">
                                    <div className="qr-box">
                                        <img src={qrCodeUrl} alt="UPI QR Code" />
                                        <div className="scan-instructions">
                                            <span>Scan using GPay, PhonePe, Paytm, or BHIM</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="upi-id-copier">
                                    <p>Or send payment directly to:</p>
                                    <div className="copier-input-group">
                                        <input type="text" value={upiId} readOnly />
                                        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopyUpi}>
                                            {copied ? '✓ Copied' : '📋 Copy ID'}
                                        </button>
                                    </div>
                                </div>

                                <div className="action-button-group">
                                    <button className="confirm-payment-btn primary-pulse" onClick={() => processOrder('upi')}>
                                        ✓ I Have Done The Payment
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="cod-payment-panel">
                                <div className="cod-badge">💵</div>
                                <h3>Cash on Delivery</h3>
                                <p className="cod-helper-text">
                                    You can pay with cash or show any UPI QR code to our delivery partner at the time of delivery. 
                                    Please keep the exact amount ready if paying in cash.
                                </p>
                                
                                <div className="action-button-group">
                                    <button className="confirm-payment-btn" onClick={() => processOrder('cod')}>
                                        Place Order (COD)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="order-summary-panel">
                    <h2>Order Summary</h2>
                    <div className="items-list-container">
                        {cartItems.map((item) => (
                            <div key={item.FoodID} className="summary-item-row">
                                <span className="item-name">{item.FoodName} <strong>x{item.Quantity}</strong></span>
                                <span className="item-price">₹{(item.Price * item.Quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="summary-total-divider"></div>
                    
                    <div className="summary-pricing-breakdown">
                        <div className="breakdown-row">
                            <span>Subtotal</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                        <div className="breakdown-row">
                            <span>Delivery Charges</span>
                            <span className="free-delivery">FREE</span>
                        </div>
                        <div className="breakdown-row grand-total">
                            <span>Grand Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PaymentPage
