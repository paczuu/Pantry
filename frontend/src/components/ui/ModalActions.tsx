import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../../language/LanguageContext';

interface ModalActionsProps {
  /** Label of the confirm button; defaults to the translated "Save". */
  submitLabel?: string;
  /** Id of the `<form>` the submit button belongs to (the buttons live in the modal header). */
  formId: string;
  isSubmitting?: boolean;
  onCancel: () => void;
}

/** Cancel + submit pair rendered in a modal header. "Cancel" is hidden on phones (the X already closes). */
export const ModalActions: React.FC<ModalActionsProps> = ({ submitLabel, formId, isSubmitting, onCancel }) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2 mr-1">
      <Button variant="ghost" size="sm" className="hidden sm:inline-flex" disabled={isSubmitting} onClick={onCancel}>
        {t('common.cancel')}
      </Button>
      <Button
        variant="primary"
        size="sm"
        type="submit"
        form={formId}
        disabled={isSubmitting}
        icon={
          isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          )
        }
      >
        {submitLabel ?? t('common.save')}
      </Button>
    </div>
  );
};
