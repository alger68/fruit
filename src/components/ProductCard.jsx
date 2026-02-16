import React from 'react';
import './ProductCard.css';

export default function ProductCard({ product, onAddToCart }) {
    return (
        <article className="product-card">
            <div className="product-card__image-wrapper">
                <span className="product-card__emoji" role="img" aria-label={product.name}>
                    {product.emoji}
                </span>
            </div>
            <div className="product-card__content">
                <h3 className="product-card__title">{product.name}</h3>
                <p className="product-card__price">${product.price.toFixed(2)}</p>
                <button className="btn btn-primary product-card__btn" onClick={() => onAddToCart(product)}>
                    Add to Cart
                </button>
            </div>
        </article>
    );
}
