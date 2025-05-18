"use client";

import { NLInterface } from './NLInterface';

type NLInterfaceWrapperProps = {
  projectId: string;
  dataModelId: string;
};

export function NLInterfaceWrapper({ projectId, dataModelId }: NLInterfaceWrapperProps) {
  return <NLInterface projectId={projectId} dataModelId={dataModelId} />;
}

export default NLInterfaceWrapper;
