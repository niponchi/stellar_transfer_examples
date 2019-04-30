const { Keypair, Operation, Server, TransactionBuilder, Network, Asset, TimeoutInfinite, Memo } = require('stellar-sdk')

const horizonUrl = 'https://horizon-testnet.stellar.org'
Network.useTestNetwork()
const server = new Server(horizonUrl)
const engine = require('./engine')(server)

const distributeXlm = async (agentPool, masterAccount, amount, ...walletAccounts) => {
  console.log('distribute xlm')
  walletAccounts.map((w, i) => {
    let operations = [Operation.payment({
      source: masterAccount.publicKey(),
      amount: `${amount}`,
      asset: Asset.native(),
      destination: w.publicKey(),
    })]

    let memo = Memo.text(`payment - wallet ${i}`)

    agentPool.queueTx(
      operations,
      [masterAccount],
      memo,
      (ret) => {
        console.log(ret.hash)
      })
  })
}

const initAgentPool = (poolAccounts) => {
  let running = false
  agents = poolAccounts.map(a => ({
    account: a,
  }))

  txQueue = []

  const executeTx = async (agent, { operations, signers, memo, callback }) => {
    let account = await server.loadAccount(agent.account.publicKey())

    const txBuilder = new TransactionBuilder(account, { fee: 100 })
      .setTimeout(TimeoutInfinite)
    operations.forEach(operation => txBuilder.addOperation(operation))
    memo && txBuilder.addMemo(memo)
    let transaction = txBuilder.build()
    transaction.sign(agent.account, ...signers)
    result = await server.submitTransaction(transaction)
    callback && callback(result)
  }

  const startPool = () => {
    if (running) return

    while (txQueue.length && agents.length) {
      let agent = agents.shift()
      let tx = txQueue.shift()
      executeTx(agent, tx)
        .catch(engine.printError)
        .then(() => {
          agents.push(agent)
          setImmediate(() => startPool())
        })
    }
    running = false
  }

  const queueTx = (operations, signers, memo = null, callback = _ => { }) => {
    txQueue.push({ operations, signers, memo, callback })
    startPool()
  }

  return {
    queueTx
  }
}

const start = async () => {
  console.log('example 4 - agent pool')
  const godAccount = Keypair.random()
  const masterAccount = Keypair.random()
  const walletCount = 10
  const poolCount = 5
  const wallets = Array.from(Array(walletCount)).map(a => Keypair.random())
  const agentAccounts = Array.from(Array(poolCount)).map(a => Keypair.random())
  engine.printAccount(godAccount, 'G O D')
  engine.printAccount(masterAccount, 'master')
  wallets.forEach((a, i) => engine.printAccount(a, `wallet ${i}`))
  agentAccounts.forEach((a, i) => engine.printAccount(a, `agent ${i}`))

  const agentPool = initAgentPool(agentAccounts)

  await engine.initAccountWithFriendBot(godAccount.publicKey())
  await engine.createAccounts(godAccount, 2, masterAccount, ...wallets, ...agentAccounts)
  await engine.transferNative(godAccount, masterAccount.publicKey(), 20)

  await engine.showBalance(masterAccount.publicKey())
  await distributeXlm(agentPool, masterAccount, 2, ...wallets)

  setTimeout(
    () => engine.showBalance(masterAccount.publicKey()),
    15000
  )
}

start()
  .then(_ => console.log('D O N E'))
  .catch(engine.printError)
