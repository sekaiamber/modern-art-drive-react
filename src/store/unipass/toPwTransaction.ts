/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  Cell,
  CellDep,
  OutPoint,
  RawTransaction,
  Script,
  Transaction,
  Amount,
  AmountUnit,
  Builder,
  CHAIN_SPECS,
  RPC as ToolKitRpc,
} from '@lay2/pw-core'
import RPC from '@nervosnetwork/ckb-sdk-rpc'
import { IS_MAINNET, CKB_NODE_URL } from '../../constants'

const chainSpec = IS_MAINNET ? CHAIN_SPECS.Lina : CHAIN_SPECS.Aggron

const pwDeps = [chainSpec.defaultLock.cellDep, chainSpec.pwLock.cellDep]

export const toolkitRPC = new ToolKitRpc(CKB_NODE_URL)

// const Secp256R1BinOutPoint = new OutPoint(
//   '0x9687ac5e311d009df1505459afc83a55c46496eb292fc11e4f6c24df5dfd4de5',
//   '0x0'
// )
const UnipassWitnessArgs = {
  lock: '0x' + '0'.repeat(2082),
  input_type: '',
  output_type: '',
}

export default async function rawTransactionToPWTransaction(
  rawTx: RPC.RawTransaction,
  isUnipass = true
): Promise<Transaction> {
  const [input]: any[] = rawTx.inputs
  const inputs = input.lock == null && input.type == null ? await Promise.all(
    rawTx.inputs.map(
      async (i) =>
        await Cell.loadFromBlockchain(
          toolkitRPC,
          new OutPoint(i.previous_output?.tx_hash!, i.previous_output?.index!)
        )
    )
  ) : rawTx.inputs.map(
    (o: any) =>
      new Cell(
        new Amount(o.capacity, AmountUnit.shannon),
        new Script(o.lock.code_hash, o.lock.args, o.lock.hash_type),
        o.type != null
          ? new Script(o.type.code_hash, o.type.args, o.type.hash_type)
          : undefined,
        new OutPoint(o.previous_output.tx_hash, o.previous_output.index)
      )
  )

  const outputs = rawTx.outputs.map(
    (o, index) =>
      new Cell(
        new Amount(o.capacity, AmountUnit.shannon),
        new Script(o.lock.code_hash, o.lock.args, o.lock.hash_type as any),
        o.type != null
          ? new Script(o.type.code_hash, o.type.args, o.type.hash_type as any)
          : undefined,
        undefined,
        rawTx.outputs_data[index]
      )
  )

  const cellDeps = rawTx.cell_deps.map(
    (c) =>
      new CellDep(
        c.dep_type as any,
        new OutPoint(c.out_point?.tx_hash!, c.out_point?.index!)
      )
  )

  const tx = new Transaction(
    new RawTransaction(
      inputs,
      outputs,
      cellDeps.concat(!isUnipass ? pwDeps : [])
      // rawTx.header_deps,
      // rawTx.version
    ),
    [
      !isUnipass
        ? IS_MAINNET
          ? Builder.WITNESS_ARGS.RawSecp256k1
          : Builder.WITNESS_ARGS.Secp256k1
        : UnipassWitnessArgs,
    ]
  )

  return tx
}