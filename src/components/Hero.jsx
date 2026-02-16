import React from 'react';
import './Hero.css';

export default function Hero() {
    return (
        <section className="hero" id="home">
            <div className="container hero__container">
                <div className="hero__content">
                    <h1 className="hero__title">
                        Freshness Delivered <br />
                        <span className="highlight">Daily to You</span>
                    </h1>
                    <p className="hero__text">
                        Experience the finest selection of premium fruits, sourced directly from organic farms. Taste the difference of true quality.
                    </p>
                    <div className="hero__actions">
                        <a href="#products" className="btn btn-primary">Shop Now</a>
                    </div>
                </div>
                <div className="hero__image">
                    <div className="hero__blob">🍎 🍊 🍇</div>
                </div>
            </div>
        </section>
    );
}
