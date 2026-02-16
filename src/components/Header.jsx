import React from 'react';
import './Header.css';

export default function Header({ cartCount, onOpenCart }) {
    return (
        <header className="header">
            <div className="container header__container">
                <a href="/" className="logo">
                    <span className="logo__icon">🥝</span>
                    FruitTrade
                </a>

                <nav className="nav">
                    <ul className="nav__list">
                        <li><a href="#home" className="nav__link">Home</a></li>
                        <li><a href="#products" className="nav__link">Shop</a></li>
                        <li><a href="#about" className="nav__link">About</a></li>
                    </ul>
                </nav>

                <div className="header__actions">
                    <button className="cart-btn" aria-label="Cart" onClick={onOpenCart}>
                        🛒 <span className="cart-badge">{cartCount}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}
