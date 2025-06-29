// src/components/ProjectLayout.js - ULTRA MINIMAL VERSION
import React from "react";
import Sidebar from "./Sidebar";
import { Outlet } from "react-router-dom";

export default function ProjectLayout() {
    console.log('🧪 Ultra minimal ProjectLayout rendered');

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <div style={{
                flex: 1,
                marginLeft: 280,
                backgroundColor: '#ffffff',
                minHeight: '100vh',
                padding: '20px'
            }}>
                <div style={{ marginBottom: '20px' }}>
                    <h3>🧪 Ultra Minimal Project Layout</h3>
                    <p>No theme context, no complex styling.</p>
                </div>
                <Outlet />
            </div>
        </div>
    );
}