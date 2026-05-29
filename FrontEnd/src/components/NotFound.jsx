import React from 'react'
import { useNavigate } from 'react-router-dom'
import './CSS/About.css' // Reuse general container spacing styles

const NotFound = () => {
    const navigate = useNavigate()

    return (
        <div className="about-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div className="about-header" style={{ marginBottom: '40px' }}>
                <span style={{ fontSize: '6rem', display: 'block', marginBottom: '10px' }}>🍕🔍</span>
                <h1 style={{ fontSize: '3rem', color: '#a75e3d', margin: '10px 0' }}>404 - Deliciously Lost</h1>
                <p style={{ fontSize: '1.2rem', color: '#666' }}>We couldn't find the page you were looking for. Perhaps it got eaten!</p>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                <button 
                    onClick={() => navigate('/')} 
                    style={{
                        padding: '12px 30px',
                        fontSize: '1rem',
                        fontWeight: '700',
                        backgroundColor: '#a75e3d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(167, 94, 61, 0.25)',
                        transition: 'transform 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                    Back to Home Menu
                </button>
            </div>
        </div>
    )
}

export default NotFound
