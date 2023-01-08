/* eslint-disable @typescript-eslint/no-empty-function */
import React from 'react';

export type ContextState = Record<string, any>;

export type CFormContextData = {
  formName: string;
  formState: ContextState;
  conditionConfig: Record<string, (state: ContextState) => boolean>;
  updateContext: (newState: ContextState) => void;
  updateConditionConfig: (
    name: string,
    cb: (state: ContextState) => boolean
  ) => void;
};

export const CFormContext = React.createContext<CFormContextData>({
  formName: '',
  formState: {},
  conditionConfig: {},
  updateContext: () => {},
  updateConditionConfig: () => {},
});
