+ `.feed_notify.txt` in home directory should exist and have feed URLs separated
   by newline
+ `.feed_notify.db` in home directory will be created and will contain seen
   notification hash
+ For very first time, to build existing feed without sending notification:
  `./index.js build`
+ Default timing:
    + When starts
    + Every 5 minute
+ The request time between each URL on above timing is 2 seconds
+ It is a good idea to delete and build every n days to keep db size small