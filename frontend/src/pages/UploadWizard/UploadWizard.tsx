import { useState, Fragment } from 'react';
import styles from './UploadWizard.module.scss';
import FileUpload from '../../components/FileUpload/FileUpload';
import ColumnMapForm from '../../components/ColumnMapForm/ColumnMapForm';
import TaskStatus from '../../components/TaskStatus/TaskStatus';

const STEPS = [
  { n: 1, label: 'Upload file' },
  { n: 2, label: 'Map columns' },
  { n: 3, label: 'Processing' },
];

function UploadWizard() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  const currentStep = taskId ? 3 : fileId ? 2 : 1;

  return (
    <div className={styles.uploadWizard}>
      <div className={styles.uploadWizard__container}>
        <header className={styles.uploadWizard__header}>
          <span className={styles.uploadWizard__eyebrow}>Data import</span>
          <h2 className={styles.uploadWizard__title}>Upload Wizard</h2>
          <p className={styles.uploadWizard__subtitle}>
            Upload salary datasets, map columns, and start analytics processing.
          </p>
        </header>

        <div className={styles.uploadWizard__steps}>
          {STEPS.map(({ n, label }, i) => (
            <Fragment key={n}>
              {i > 0 && <div className={styles.uploadWizard__stepDivider} />}
              <div
                className={[
                  styles.uploadWizard__step,
                  currentStep === n ? styles['uploadWizard__step--active'] : '',
                  currentStep > n ? styles['uploadWizard__step--done'] : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={styles.uploadWizard__stepNum}>{n}</span>
                <span className={styles.uploadWizard__stepLabel}>{label}</span>
              </div>
            </Fragment>
          ))}
        </div>

        <div className={styles.uploadWizard__card}>
          {!fileId ? (
            <FileUpload onUploaded={setFileId} />
          ) : (
            <div className={styles.uploadWizard__fileSuccess}>
              <span className={styles.uploadWizard__fileSuccessIcon}>✓</span>
              <div>
                <p className={styles.uploadWizard__fileSuccessTitle}>File uploaded successfully</p>
                <code className={styles.uploadWizard__fileId}>{fileId}</code>
              </div>
            </div>
          )}
        </div>

        {fileId && !taskId && (
          <div className={styles.uploadWizard__card}>
            <div className={styles.uploadWizard__sectionHeader}>
              <h3 className={styles.uploadWizard__sectionTitle}>Map columns</h3>
              <p className={styles.uploadWizard__sectionHint}>
                Match your CSV column names to the expected fields.
              </p>
            </div>
            <ColumnMapForm fileId={fileId} onMapped={setTaskId} />
          </div>
        )}

        {taskId && (
          <div className={styles.uploadWizard__card}>
            <div className={styles.uploadWizard__sectionHeader}>
              <h3 className={styles.uploadWizard__sectionTitle}>Processing</h3>
              <p className={styles.uploadWizard__sectionHint}>
                Your dataset is being ingested. This may take a moment.
              </p>
            </div>
            <TaskStatus taskId={taskId} />
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadWizard;
