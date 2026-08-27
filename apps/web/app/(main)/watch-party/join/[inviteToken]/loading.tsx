export default function WatchPartyLoading() {
  return (
    <div className="sesh-watch-party-page">
      <div className="sesh-watch-party-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="sesh-glass-panel w-full max-w-lg p-6 text-center">
          <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-white/15 border-t-[#ff4b86]" />
          <h1 className="text-xl font-semibold text-white md:text-2xl">
            Загружаем совместный просмотр...
          </h1>
          <p className="mt-2 text-sm text-white/62">
            Восстанавливаем комнату и подключение.
          </p>
        </div>
      </div>
    </div>
  );
}
