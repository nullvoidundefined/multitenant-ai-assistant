'use client';

import { useAuth } from '@/contexts/AuthContext';

import styles from './page.module.scss';

export default function HomePage() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className={styles.container}>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.hero}>
                    <h1 className={styles.title}>AI Assistant</h1>
                    <p className={styles.subtitle}>
                        Each organization gets its own AI assistant with isolated conversations,
                        configurable system prompts, and per-tenant knowledge base.
                    </p>
                    <div className={styles.actions}>
                        <a href="/login" className={styles.primaryButton}>
                            Log In
                        </a>
                        <a href="/register" className={styles.secondaryButton}>
                            Sign Up
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.hero}>
                <h1 className={styles.title}>AI Assistant</h1>
                <p className={styles.subtitle}>
                    Welcome back, {user.first_name || user.email}
                </p>
                <div className={styles.actions}>
                    <a href="/orgs" className={styles.primaryButton}>
                        My Organizations
                    </a>
                </div>
            </div>
        </div>
    );
}
