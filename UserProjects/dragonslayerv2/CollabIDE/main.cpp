#include <iostream>
#include <stdio>
#include <vector>
using namespace std;

int main() {
    int t;
    cin >> t;
    while (t--) {
        int n;
        int k;
        cin >> n;
        cin >> k;
        vector<int> a(n);
        for (int i = 0; i < n; i++) {
            cin >> a[i];   
        }
        
        for (int i = 0; i < n; i++) {
            cout << a[i] << " ";
        }
        cout << endl;
        vector<int> b = a;
        sort(b.begin(), b.end());
        for (int i = 0; i < n; i++) {
            cout << b[i] << " ";
        }
        cout << endl;
    }
}
