'use client';

import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { get, post } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import styles from './orgs.module.scss';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  created_at: string;
}

export default function OrgsPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newOrgName, setNewOrgName] = useState('');
  const [error, setError] = useState('');

  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => get<{ data: Organization[] }>('/orgs'),
    enabled: !!user,
  });

  const createOrg = useMutation({
    mutationFn: (name: string) =>
      post<{ data: Organization }>('/orgs', { name }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['orgs'] });
      setNewOrgName('');
      setError('');
      router.push(`/orgs/${res.data.id}/chat`);
    },
    onError: (err) => {
      setError(
        err instanceof Error ? err.message : 'Failed to create organization',
      );
    },
  });

  const handleCreate = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!newOrgName.trim()) return;
      createOrg.mutate(newOrgName.trim());
    },
    [newOrgName, createOrg],
  );

  if (authLoading) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const orgs = orgsData?.data ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Organizations</h1>
        <button className={styles.logoutButton} onClick={() => logout()}>
          Log Out
        </button>
      </div>

      <form className={styles.createForm} onSubmit={handleCreate}>
        <input
          className={styles.input}
          type='text'
          placeholder='New organization name'
          value={newOrgName}
          onChange={(e) => setNewOrgName(e.target.value)}
          required
        />
        <button
          className={styles.createButton}
          type='submit'
          disabled={createOrg.isPending}
        >
          {createOrg.isPending ? 'Creating...' : 'Create'}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {orgsLoading ? (
        <p className={styles.empty}>Loading organizations...</p>
      ) : orgs.length === 0 ? (
        <p className={styles.empty}>
          No organizations yet. Create one to get started.
        </p>
      ) : (
        <div className={styles.orgList}>
          {orgs.map((org) => (
            <a
              key={org.id}
              href={`/orgs/${org.id}/chat`}
              className={styles.orgCard}
            >
              <div className={styles.orgName}>{org.name}</div>
              <div className={styles.orgMeta}>
                <span className={styles.roleBadge}>{org.role}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
