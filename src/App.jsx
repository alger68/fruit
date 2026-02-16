import { useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import ProductCard from './components/ProductCard'
import Cart from './components/Cart'
import { products } from './data'

function App() {
  const [cartItems, setCartItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setIsCartOpen(true)
  }

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id))
  }

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) {
      removeFromCart(id)
      return
    }
    setCartItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ))
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    try {
      const total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: cartItems, total }),
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Order placed successfully! Order ID: ${data.orderId}`)
        setCartItems([])
        setIsCartOpen(false)
      } else {
        alert('Failed to place order. Please try again.')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('An error occurred during checkout.')
    }
  }

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  const categories = ['All', ...new Set(products.map(p => p.category))]

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory)

  return (
    <div className="app">
      <Header cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} />
      <main>
        <Hero />
        <section className="container section" id="products">
          <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Featured Fruits</h2>

          <div className="filters">
            {categories.map(category => (
              <button
                key={category}
                className={`btn btn-outline ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="product-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '2rem',
            marginTop: '2rem'
          }}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No products found in this category.
            </p>
          )}
        </section>
      </main>
      <Cart
        cartItems={cartItems}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={handleCheckout}
      />
    </div>
  )
}

export default App
