export type NBTComponent =
    {[p: string]: NBTComponent}
    | NBTComponent[]
    | number
    | string
    | null
    | undefined;

export interface NBTCompound { [p: string]: NBTComponent }

