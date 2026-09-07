export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <h1 className="text-2xl font-bold">
          ATS<span className="text-blue-500">Scanner</span>
        </h1>

        <button className="rounded-lg bg-blue-600 px-5 py-2 hover:bg-blue-700">
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">

        <h2 className="text-5xl font-bold tracking-tight">
          Beat the ATS.
          <br />
          <span className="text-blue-500">
            Get More Interviews.
          </span>
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
          Upload your resume and compare it against a job description
          to see how well your resume matches.
        </p>

        {/* Scanner */}
        <div className="mt-12 grid gap-6 md:grid-cols-2">

          {/* Resume Upload */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">

            <h3 className="text-xl font-semibold">
              Upload Resume
            </h3>

            {/* Resume Upload */}
<div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">

  <h3 className="text-xl font-semibold">
    Upload Resume
  </h3>

  <label className="mt-6 flex h-48 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-700 hover:border-blue-500">

    <div className="text-center">
      <p className="text-4xl">📄</p>

      <p className="mt-3 font-medium">
        Click to upload your resume
      </p>

      <p className="mt-2 text-sm text-gray-500">
        PDF or DOCX
      </p>
    </div>

    <input
      type="file"
      accept=".pdf,.docx"
      className="hidden"
    />

  </label>

</div>

          </div>

          {/* Job Description */}
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">

            <h3 className="text-xl font-semibold">
              Job Description
            </h3>

            <textarea
              placeholder="Paste the job description here..."
              className="mt-6 h-48 w-full resize-none rounded-xl border border-gray-700 bg-gray-950 p-4 text-white outline-none focus:border-blue-500"
            />

          </div>

        </div>

        {/* Scan Button */}
        <button className="mt-8 rounded-xl bg-blue-600 px-10 py-4 text-lg font-semibold hover:bg-blue-700">
          Scan My Resume
        </button>

      </section>

    </main>
  );
}