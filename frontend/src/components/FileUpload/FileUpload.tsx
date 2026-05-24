import styles from './FileUpload.module.scss';
import { uploadFile } from '../../lib/api';
import Button from '../Button/Button';
import toast from 'react-hot-toast';

type Props = { onUploaded: (fileId: string) => void };

const pickFileId = (resp: unknown): string | null => {
  if (!resp || typeof resp !== 'object') return null;

  const obj = resp as Record<string, unknown>;

  // direct keys
  if (typeof obj['file_id'] === 'string') return obj['file_id'];
  if (typeof obj['fileId'] === 'string') return obj['fileId'];
  if (typeof obj['id'] === 'string') return obj['id'];

  // nested: result.file_id
  const result = obj['result'];
  if (
    result &&
    typeof result === 'object' &&
    typeof (result as Record<string, unknown>)['file_id'] === 'string'
  ) {
    return (result as Record<string, unknown>)['file_id'] as string;
  }

  // nested: data.file_id
  const data = obj['data'];
  if (
    data &&
    typeof data === 'object' &&
    typeof (data as Record<string, unknown>)['file_id'] === 'string'
  ) {
    return (data as Record<string, unknown>)['file_id'] as string;
  }

  return null;
};

function FileUpload({ onUploaded }: Props) {
  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const resp = await uploadFile(file);
      const id = pickFileId(resp);
      if (!id) {
        toast.error('Upload succeeded, but file_id not found in response.');
        return;
      }
      onUploaded(id);
      toast.success('File uploaded successfully!', { duration: 2000 });
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err?.message || 'Upload failed');
      }
    }
  }

  return (
    <div className={styles.fileUpload}>
      <div className={styles.fileUpload__dropzone}>
        <svg
          className={styles.fileUpload__icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4m0 0L8 8m4-4 4 4" />
          <path d="M20 16.5A3.5 3.5 0 0 1 16.5 20h-9A3.5 3.5 0 0 1 4 16.5" />
        </svg>
        <p className={styles.fileUpload__title}>Upload your dataset</p>
        <p className={styles.fileUpload__hint}>CSV, XLS, or XLSX files are supported.</p>
        <Button accept=".csv,.xls,.xlsx" buttonStyle="default" onFileChange={handleChange}>
          Choose file
        </Button>
      </div>
    </div>
  );
}

export default FileUpload;
