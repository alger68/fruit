import React from 'react';
import './Cart.css';

export default function Cart({ cartItems, removeFromCart, updateQuantity, isOpen, onClose, onCheckout }) {
    if (!isOpen) return null;

    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="cart-overlay" onClick={onClose}>
            <aside className="cart-sidebar" onClick={e => e.stopPropagation()}>
                <div className="cart-header">
                    <h2>Your Cart ({cartItems.length})</h2>
                    <button className="cart-close" onClick={onClose} aria-label="Close cart">×</button>
                </div>

                <div className="cart-items">
                    {cartItems.length === 0 ? (
                        <p className="cart-empty">Your cart is empty.</p>
                    ) : (
                        cartItems.map(item => (
                            <div key={item.id} className="cart-item">
                                <span className="cart-item-emoji">{item.emoji}</span>
                                <div className="cart-item-info">
                                    <h4>{item.name}</h4>
                                    <p>${item.price.toFixed(2)}</p>
                                </div>
                                <div className="cart-item-controls">
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                                </div>
                                <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>×</button>
                            </div>
                        ))
                    )}
                </div>

                <div className="cart-footer">
                    <div className="cart-total">
                        <span>Total:</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    <button
                        className="btn btn-primary cart-checkout-btn"
                        disabled={cartItems.length === 0}
                        onClick={onCheckout}
                    >
                        Proceed to Checkout
                    </button>
                </div>
            </aside>
        </div>
    );
}
