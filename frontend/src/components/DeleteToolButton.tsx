'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteToolButton({ id }: { id: number | string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/tools/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/tools');
        router.refresh();
      } else {
        alert('Failed to delete tool.');
        setIsDeleting(false);
      }
    } catch (e) {
      alert('Error deleting tool.');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 font-label-lg text-label-lg transition-colors border border-red-500/20"
    >
      <span className="material-symbols-outlined text-sm">delete</span>
      <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
    </button>
  );
}
