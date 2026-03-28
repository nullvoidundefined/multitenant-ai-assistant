'use client';

import { useAuth } from '@/contexts/AuthContext';
import { get } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';

import styles from './settings.module.scss';

interface OrgDetails {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

interface Member {
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SettingsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['org', orgId],
    queryFn: () => get<{ data: OrgDetails }>(`/orgs/${orgId}`),
    enabled: !!user && !!orgId,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: () => get<{ data: Member[] }>(`/orgs/${orgId}/members`),
    enabled: !!user && !!orgId,
  });

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

  const org = orgData?.data;
  const members = membersData?.data ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href={`/orgs/${orgId}/chat`} className={styles.backLink}>
          &larr; Back to Chat
        </a>
        <h1 className={styles.title}>Organization Settings</h1>
      </div>

      {/* Org info card */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Organization</h2>
        {orgLoading ? (
          <p className={styles.loadingText}>Loading...</p>
        ) : org ? (
          <div className={styles.orgInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>{org.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Slug</span>
              <span className={styles.infoValue}>
                <code className={styles.slug}>{org.slug}</code>
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Created</span>
              <span className={styles.infoValue}>
                {formatDate(org.created_at)}
              </span>
            </div>
          </div>
        ) : (
          <p className={styles.loadingText}>Organization not found.</p>
        )}
      </div>

      {/* Members card */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Members</h2>
        {membersLoading ? (
          <p className={styles.loadingText}>Loading members...</p>
        ) : members.length === 0 ? (
          <p className={styles.loadingText}>No members found.</p>
        ) : (
          <table className={styles.membersTable}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.user_id}>
                  <td>{member.email}</td>
                  <td>
                    <span
                      className={`${styles.roleBadge} ${
                        member.role === 'admin'
                          ? styles.roleBadgeAdmin
                          : member.role === 'member'
                            ? styles.roleBadgeMember
                            : styles.roleBadgeViewer
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td>{formatDate(member.joined_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
