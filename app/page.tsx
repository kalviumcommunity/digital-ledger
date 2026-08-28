export default function Login(){
    return(
        <div className="flex flex-col items-center justify-center bg-white min-h-screen">
           <div className="w-full max-w-lg border border-black rounded-xl p-10 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold text-black mb-4 mt-8">Welcome Back</h1>
            <p className="text-sm text-gray-600 mb-12 text-center">Great to see you again! Let's get your shop's customers, payments, and dues organized.</p>

            <label className="self-start text-black font-bold mb-2 text-sm">EMAIL ADDRESS</label>
            <input type="email" placeholder="Enter your email" className="h-14 text-sm text-black border rounded-lg p-3 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-red-800" />
            
            <label className="self-start text-black font-bold mb-2 text-sm">MOBILE NUMBER</label>
            <input type="text" placeholder="Enter your mobile number" className="h-14 text-sm text-black border rounded-lg p-3 w-full mb-4 focus:outline-none focus:ring-2 focus:ring-red-800" />

          <div className="flex justify-between items-center w-full mb-2">
            <label className="text-black font-bold text-sm">PASSWORD</label>
            <a href="/forgot-password" className="text-black text-xs hover:underline"> Forgot password?</a>
          </div>

            <input type="password" placeholder="Enter your password" className="h-14 text-sm text-black border rounded-lg p-3 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-red-800" />

            <div className="w-full flex items-center gap-2 mb-8">
                <input type="checkbox" />
                <label className=" text-xs text-gray-600"> Remember this device</label>
            </div>

            <button className="h-14 w-full font-bold bg-black text-white box-border border border-black rounded-lg transition duration-300 hover:bg-red-800 hover:text-black hover:border-black">Log In</button>

            <p className="text-xs text-black mt-4 mb-8">
                Don't have an account? {""}
                <a href="/register" className="text-black text-xs hover:underline">Register</a>
            </p>
           </div> 
        </div>
    );
}